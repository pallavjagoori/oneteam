require 'rails_helper'

# OneTeam coverage for Instagram token refreshes that fail: the old token is
# kept.
RSpec.describe Instagram::RefreshOauthTokenService do
  let(:channel) { create(:channel_instagram, access_token: 'old-token') }
  let(:service) { described_class.new(channel: channel) }

  before { allow(Rails.logger).to receive(:error) }

  it 'raises when Instagram rejects the refresh' do
    stub_request(:get, %r{graph.instagram.com/refresh_access_token}).to_return(status: 400, body: '{"error":"expired"}')

    expect { service.send(:refresh_long_lived_token) }.to raise_error(RuntimeError, /Failed to refresh Instagram token/)
  end

  it 'keeps the current token when the refresh fails' do
    allow(service).to receive(:refresh_long_lived_token).and_raise(StandardError, 'down')

    expect(service.send(:attempt_token_refresh)).to eq('old-token')
    expect(Rails.logger).to have_received(:error).with('Token refresh failed: down')
  end
end
