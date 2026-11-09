require 'rails_helper'

RSpec.describe SafeFetch::PrivateNetworkRequest do
  let(:options) do
    Struct.new(:url, :resolver, :http_method, :request_options, :body).new(
      'http://example.com/start', ->(_host) { [IPAddr.new('10.0.0.1')] }, :get, {}, nil
    )
  end
  let(:request) { described_class.new(options) }

  it 'gives up after too many redirects' do
    allow(request).to receive(:fetch_once).and_return([instance_double(Net::HTTPFound), 'http://example.com/next'])

    expect { request.perform }.to raise_error(SsrfFilter::TooManyRedirects, %r{fetching http://example.com/start})
  end

  it 'rejects schemes outside the allow list' do
    expect { request.send(:validate_scheme!, URI('ftp://example.com/file')) }
      .to raise_error(SsrfFilter::InvalidUriScheme, /ftp/)
  end

  it 'rejects headers that carry CRLF characters' do
    expect { request.send(:validate_request!, { 'x-test' => "a\r\nb" }) }
      .to raise_error(SsrfFilter::CRLFInjection, /x-test/)
  end

  it 'keeps a non-default port in the host header' do
    expect(request.send(:normalized_hostname, URI('https://example.com:8443/path'))).to eq('example.com:8443')
  end
end
