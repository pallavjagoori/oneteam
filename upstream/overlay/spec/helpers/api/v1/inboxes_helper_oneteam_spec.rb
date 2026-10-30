require 'rails_helper'

# OneTeam coverage for checking an email inbox's IMAP and SMTP settings
# before saving it. Each kind of connection failure is turned into a
# readable error for the inbox form, and SMTP encryption follows the
# chosen TLS / STARTTLS option and certificate check.
describe Api::V1::InboxesHelper do
  let(:host) do
    Class.new do
      include Api::V1::InboxesHelper

      attr_accessor :channel_data

      def permitted_params(_attributes = nil)
        { channel: channel_data }
      end
    end.new
  end

  def validate(**channel)
    host.channel_data = channel.with_indifferent_access
    host.validate_email_channel([])
  end

  describe 'IMAP' do
    let(:imap_settings) do
      { imap_enabled: true, imap_address: 'imap.example.com', imap_port: 993, imap_enable_ssl: true, imap_login: 'me',
        imap_password: 'pw', imap_authentication: 'plain' }
    end

    before { allow(Rails.logger).to receive(:error) }

    def imap_fails_with(error)
      allow(Net::IMAP).to receive(:new).and_raise(error)
    end

    it 'explains each kind of connection failure' do
      no_response = Net::IMAP::NoResponseError.new(Struct.new(:data).new(Struct.new(:text).new('denied')))
      {
        SocketError.new('dns') => 'errors.inboxes.imap.socket_error',
        no_response => 'errors.inboxes.imap.no_response_error',
        Errno::EHOSTUNREACH.new => 'errors.inboxes.imap.host_unreachable_error',
        Net::IMAP::Error.new('closed') => 'errors.inboxes.imap.connection_closed_error'
      }.each do |error, key|
        imap_fails_with(error)
        expect { validate(**imap_settings) }.to raise_error(StandardError, I18n.t(key))
      end

      imap_fails_with(Net::OpenTimeout.new)
      expect { validate(**imap_settings) }
        .to raise_error(StandardError, I18n.t('errors.inboxes.imap.connection_timed_out_error', address: 'imap.example.com', port: 993))
    end

    it 'passes other errors through and logs them' do
      imap_fails_with(ArgumentError.new('odd'))

      expect { validate(**imap_settings) }.to raise_error(StandardError, 'odd')
      expect(Rails.logger).to have_received(:error).with('[Api::V1::InboxesHelper] check_imap_connection failed with odd')
    end
  end

  describe 'SMTP' do
    let(:smtp) { instance_double(Net::SMTP, 'open_timeout=': nil, finish: nil, enable_tls: nil, enable_starttls_auto: nil) }
    let(:smtp_settings) do
      { smtp_enabled: true, smtp_address: 'smtp.example.com', smtp_port: 587, smtp_domain: 'example.com', smtp_login: 'me',
        smtp_password: 'pw' }
    end

    before { allow(Net::SMTP).to receive(:new).with('smtp.example.com', 587).and_return(smtp) }

    it 'connects with STARTTLS and the chosen certificate check' do
      expect(smtp).to receive(:start).with('example.com', 'me', 'pw', :login)
      expect(smtp).to receive(:enable_starttls_auto) { |context| expect(context.verify_mode).to eq(OpenSSL::SSL::VERIFY_NONE) }

      validate(**smtp_settings, smtp_enable_starttls_auto: true, smtp_openssl_verify_mode: 'none')
    end

    it 'connects over TLS with the default certificate check' do
      allow(smtp).to receive(:start)
      expect(smtp).to receive(:enable_tls).with(no_args)

      validate(**smtp_settings, smtp_enable_ssl_tls: true, smtp_authentication: 'plain')
    end

    it 'explains each kind of connection failure' do
      {
        Net::SMTPAuthenticationError.new('bad password') => 'errors.inboxes.smtp.authentication_error',
        Errno::ECONNREFUSED.new => 'errors.inboxes.smtp.connection_error',
        OpenSSL::SSL::SSLError.new => 'errors.inboxes.smtp.ssl_error',
        Net::SMTPServerBusy.new('busy') => 'errors.inboxes.smtp.smtp_error'
      }.each do |error, key|
        allow(smtp).to receive(:start).and_raise(error)
        expect { validate(**smtp_settings) }.to raise_error(StandardError, I18n.t(key))
      end

      allow(smtp).to receive(:start).and_raise(IOError, 'stream closed')
      expect { validate(**smtp_settings) }.to raise_error(StandardError, 'stream closed')
    end
  end
end
