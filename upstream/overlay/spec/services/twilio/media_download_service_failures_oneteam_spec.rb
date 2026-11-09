require 'rails_helper'

RSpec.describe Twilio::MediaDownloadService do
  let(:account_sid) { "AC#{'1' * 32}" }
  let(:channel) { create(:channel_twilio_sms, account_sid: account_sid) }
  let(:message_sid) { "MM#{'2' * 32}" }
  let(:media_url) { "https://api.twilio.com/2010-04-01/Accounts/#{account_sid}/Messages/#{message_sid}/Media/ME#{'3' * 32}" }

  def service(url = media_url)
    described_class.new(channel: channel, media_url: url, message_sid: message_sid, media_index: 0, retry_delays: [0])
  end

  it 'skips the download when the authenticated fetch fails without an HTTP status' do
    allow(SafeFetch).to receive(:fetch).and_raise(SafeFetch::FetchError, 'timeout')

    expect(service.perform).to be_nil
  end

  it 'skips the download when a retry after a 404 fails without an HTTP status' do
    calls = 0
    allow(SafeFetch).to receive(:fetch) do
      calls += 1
      raise SafeFetch::HttpError, '404 Not Found' if calls == 1

      raise SafeFetch::FetchError, 'timeout'
    end
    downloader = service
    allow(downloader).to receive(:sleep)

    expect(downloader.perform).to be_nil
    expect(calls).to eq(2)
  end

  it 'skips the download when both unauthenticated attempts fail' do
    allow(SafeFetch).to receive(:fetch).and_raise(SafeFetch::FetchError, 'timeout')

    expect(service('https://media.example.com/file.png').perform).to be_nil
    expect(SafeFetch).to have_received(:fetch).twice
  end

  it 'treats a malformed media URL as not eligible for authenticated retries' do
    expect(service('https://api.twilio.com/bad path').send(:valid_retry_url?)).to be(false)
  end
end
