require 'rails_helper'

# OneTeam coverage for Instagram profile lookups that fail: a missing or
# hidden profile (code 100) becomes an "Unknown" contact, and any other
# error is logged and reported, leaving the contact details empty.
describe Instagram::MessageText do
  let(:channel) { create(:channel_instagram) }
  let(:service) { described_class.new({ sender: { id: 'ig-1' }, recipient: { id: channel.instagram_id } }.with_indifferent_access, channel) }
  let(:tracker) { instance_double(ChatwootExceptionTracker, capture_exception: true) }

  before do
    service.instance_variable_set(:@inbox, channel.inbox)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
    allow(Rails.logger).to receive(:warn)
  end

  def profile_fails_with(code, message)
    stub_request(:get, %r{graph\.instagram\.com/.+/ig-1\?})
      .to_return(status: 400, body: { error: { message: message, code: code } }.to_json, headers: { 'Content-Type' => 'application/json' })
  end

  it 'treats a missing profile as an unknown user' do
    profile_fails_with(100, 'Object does not exist')

    expect(service.fetch_instagram_user('ig-1')).to eq('name' => 'Unknown (IG: ig-1)', 'id' => 'ig-1')
  end

  it 'logs and reports other errors' do
    profile_fails_with(2, 'Service temporarily unavailable')

    expect(service.fetch_instagram_user('ig-1')).to eq({})
    expect(Rails.logger).to have_received(:warn).with('[InstagramUserFetchError]: Service temporarily unavailable 2')
    expect(tracker).to have_received(:capture_exception)
  end
end
