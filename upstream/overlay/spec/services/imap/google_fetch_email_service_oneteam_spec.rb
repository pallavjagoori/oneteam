require 'rails_helper'

# OneTeam coverage for fetching mail from Gmail inboxes over IMAP with
# OAuth (XOAUTH2 and a refreshed Google access token), and for the shared
# IMAP edge cases: messages without an id, empty bodies, an empty header
# batch, the per-sync message cap and a failed logout.
RSpec.describe Imap::GoogleFetchEmailService do
  let(:channel) do
    create(:channel_email, :imap_email, provider: 'google', imap_password: '', provider_config: { 'access_token' => 'old-token' })
  end
  let(:imap) { instance_double(Net::IMAP, select: true, logout: true) }
  let(:eml) { Rails.root.join('spec/fixtures/files/only_text.eml').read }
  let(:service) { described_class.new(channel: channel) }

  before do
    allow(Net::IMAP).to receive(:new).with('imap.gmail.com', port: 993, ssl: true).and_return(imap)
    allow(Google::RefreshOauthTokenService).to receive(:new).with(channel: channel)
                                                            .and_return(instance_double(Google::RefreshOauthTokenService, access_token: 'fresh'))
    allow(imap).to receive(:authenticate).with('XOAUTH2', 'email@example.com', 'fresh')
    allow(imap).to receive(:search).and_return([1])
    allow(Rails.logger).to receive(:info)
  end

  def header(seq, raw = eml)
    Net::IMAP::FetchData.new(seq, 'BODY[HEADER]' => raw)
  end

  it 'signs in with a refreshed Google token and returns new mail' do
    allow(imap).to receive(:fetch).with([1], 'BODY.PEEK[HEADER]').and_return([header(1)])
    allow(imap).to receive(:fetch).with(1, 'BODY.PEEK[]').and_return([Net::IMAP::FetchData.new(1, 'BODY[]' => eml)])

    mails = service.perform

    expect(mails.map(&:message_id)).to eq([Mail.new(eml).message_id])
    expect(imap).to have_received(:authenticate).with('XOAUTH2', 'email@example.com', 'fresh')
  end

  it 'logs each fetched mail outside the test environment' do
    allow(Rails.env).to receive(:test?).and_return(false)
    allow(imap).to receive(:fetch).with([1], 'BODY.PEEK[HEADER]').and_return([header(1)])
    allow(imap).to receive(:fetch).with(1, 'BODY.PEEK[]').and_return([Net::IMAP::FetchData.new(1, 'BODY[]' => eml)])

    service.perform

    expect(Rails.logger).to have_received(:info).with(/Email id: .* - sequence id: 1/)
  end

  it 'fetches nothing without a Google token' do
    channel.update!(provider_config: {})

    expect(service.perform).to be_nil
  end

  it 'skips messages without an id or whose body cannot be fetched' do
    allow(imap).to receive(:fetch).with([1], 'BODY.PEEK[HEADER]').and_return([header(1)])
    allow(imap).to receive(:fetch).with(1, 'BODY.PEEK[]').and_return([Net::IMAP::FetchData.new(1, 'BODY[]' => '')])

    expect(service.perform).to eq([])
    expect(service.send(:process_message_id, [2, nil])).to be_nil
    expect(Rails.logger).to have_received(:info).with(/Fetch failed for .* with message-id/)
    expect(Rails.logger).to have_received(:info).with(/Empty message id for .* with seq no. <2>/)
  end

  it 'stops when a header batch comes back empty' do
    allow(imap).to receive(:fetch).with([1], 'BODY.PEEK[HEADER]').and_return(nil)

    expect(service.perform).to eq([])
    expect(Rails.logger).to have_received(:info).with(/Fetching the batch failed/)
  end

  it 'stops at the per-sync message cap' do
    stub_const('Imap::BaseFetchEmailService::MAX_MESSAGES_PER_SYNC', 1)
    second = eml.sub(/^Message-ID: .*$/i, 'Message-ID: <second@example.com>')
    allow(imap).to receive(:search).and_return([1, 2])
    allow(imap).to receive(:fetch).with([1], 'BODY.PEEK[HEADER]').and_return([header(1)])
    allow(imap).to receive(:fetch).with([2], 'BODY.PEEK[HEADER]').and_return([header(2, second)])
    allow(imap).to receive(:fetch).with(1, 'BODY.PEEK[]').and_return([Net::IMAP::FetchData.new(1, 'BODY[]' => eml)])

    expect(service.perform.size).to eq(1)
    expect(Rails.logger).to have_received(:info).with(/Reached MAX_MESSAGES_PER_SYNC=1/)
  end

  it 'disconnects when logging out fails' do
    allow(imap).to receive(:fetch).and_return(nil)
    allow(imap).to receive(:logout).and_raise(Net::IMAP::Error, 'gone')
    expect(imap).to receive(:disconnect)

    service.perform
  end
end
