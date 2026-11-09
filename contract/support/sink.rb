# Contract test sink: catches what the app under test sends out.
#
# - SMTP on port 1025 stores every email it receives.
# - HTTP on port 8025 stores every request posted to /hooks/... (outgoing
#   webhooks) and lets the tests read or clear what was caught:
#     GET    /messages   caught emails as JSON
#     DELETE /messages   forget caught emails
#     GET    /hooks      caught webhook requests as JSON
#     DELETE /hooks      forget caught webhook requests
#
# It uses only Ruby's standard library, so it runs in the plain ruby image
# with no gems, and it serves Chatwoot and OneTeam alike.

require 'json'
require 'socket'
require 'time'

# Thread-safe store for caught emails and webhook requests.
class SinkStore
  def initialize
    @lock = Mutex.new
    @items = { messages: [], hooks: [] }
  end

  # Adds an item to a list (:messages or :hooks).
  def add(kind, item)
    @lock.synchronize { @items[kind] << item.merge(received_at: Time.now.utc.iso8601(3)) }
  end

  # Returns a copy of a list.
  def list(kind)
    @lock.synchronize { @items[kind].dup }
  end

  # Empties a list.
  def clear(kind)
    @lock.synchronize { @items[kind].clear }
  end
end

# Minimal SMTP server: enough of RFC 5321 for Rails' Net::SMTP client.
class SmtpSink
  def initialize(store, port)
    @store = store
    @server = TCPServer.new('0.0.0.0', port)
  end

  # Accepts connections forever, one thread per client.
  def run
    loop { Thread.new(@server.accept) { |client| handle(client) } }
  end

  private

  # Speaks SMTP with one client until it quits.
  def handle(client)
    client.write("220 contract-sink ESMTP\r\n")
    envelope = { from: nil, to: [] }
    while (line = client.gets)
      command = line.strip
      case command.upcase
      when /\AEHLO/ then client.write("250-contract-sink\r\n250 8BITMIME\r\n")
      when /\AHELO/ then client.write("250 contract-sink\r\n")
      when /\AMAIL FROM:/ then envelope[:from] = address(command) and client.write("250 OK\r\n")
      when /\ARCPT TO:/ then envelope[:to] << address(command) and client.write("250 OK\r\n")
      when 'DATA'
        client.write("354 End data with <CR><LF>.<CR><LF>\r\n")
        store_message(envelope, read_data(client))
        envelope = { from: nil, to: [] }
        client.write("250 OK queued\r\n")
      when 'RSET' then envelope = { from: nil, to: [] } and client.write("250 OK\r\n")
      when 'NOOP' then client.write("250 OK\r\n")
      when 'QUIT' then client.write("221 Bye\r\n") and break
      else client.write("502 Command not implemented\r\n")
      end
    end
  ensure
    client.close
  end

  # Pulls the address out of "MAIL FROM:<a@b>" or "RCPT TO:<a@b>".
  def address(command)
    command[/<([^>]*)>/, 1] || command.split(':', 2).last.strip
  end

  # Reads the message body up to the lone dot, undoing dot-stuffing.
  def read_data(client)
    lines = []
    while (line = client.gets)
      break if line.chomp == '.'

      lines << (line.start_with?('..') ? line[1..] : line)
    end
    lines.join
  end

  # Stores a caught email with its main headers split out for easy matching.
  def store_message(envelope, raw)
    headers, body = raw.split(/\r?\n\r?\n/, 2)
    @store.add(:messages, {
                 from: envelope[:from],
                 to: envelope[:to],
                 subject: headers.to_s[/^Subject: (.*)$/i, 1]&.strip,
                 raw: raw,
                 body: body.to_s
               })
  end
end

# Minimal HTTP/1.1 server for the sink's read and webhook endpoints.
class HttpSink
  def initialize(store, port)
    @store = store
    @server = TCPServer.new('0.0.0.0', port)
  end

  # Accepts connections forever, one thread per request.
  def run
    loop { Thread.new(@server.accept) { |client| handle(client) } }
  end

  private

  # Reads one request, answers it and closes the connection.
  def handle(client)
    request_line = client.gets.to_s
    method, target = request_line.split
    headers = read_headers(client)
    body = client.read(headers['content-length'].to_i) if headers['content-length'].to_i.positive?
    status, payload = route(method, target.to_s, headers, body.to_s)
    respond(client, status, payload)
  ensure
    client.close
  end

  # Reads header lines into a lower-cased hash.
  def read_headers(client)
    headers = {}
    while (line = client.gets) && line != "\r\n"
      name, value = line.split(':', 2)
      headers[name.strip.downcase] = value.to_s.strip
    end
    headers
  end

  # Decides what each request does.
  def route(method, target, headers, body)
    path = target.split('?').first
    case [method, path]
    when %w[GET /messages] then [200, @store.list(:messages)]
    when %w[DELETE /messages] then @store.clear(:messages) && [200, { ok: true }]
    when %w[GET /hooks] then [200, @store.list(:hooks)]
    when %w[DELETE /hooks] then @store.clear(:hooks) && [200, { ok: true }]
    else
      return [404, { error: 'not found' }] unless method == 'POST' && path.start_with?('/hooks/')

      @store.add(:hooks, { path: path, headers: headers, body: body })
      [200, { ok: true }]
    end
  end

  # Writes a JSON response.
  def respond(client, status, payload)
    json = JSON.generate(payload)
    client.write("HTTP/1.1 #{status} #{status == 200 ? 'OK' : 'Not Found'}\r\n" \
                 "Content-Type: application/json\r\nContent-Length: #{json.bytesize}\r\nConnection: close\r\n\r\n#{json}")
  end
end

store = SinkStore.new
Thread.new { SmtpSink.new(store, 1025).run }
$stdout.puts 'contract sink listening: SMTP 1025, HTTP 8025'
$stdout.flush
HttpSink.new(store, 8025).run
