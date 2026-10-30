require 'rails_helper'

# OneTeam coverage for renewing TikTok access tokens and for reading and
# setting the app's direct-message webhook, plus the error raised when
# TikTok answers with a failed HTTP status.
describe Tiktok::AuthClient do
  let(:api) { 'https://business-api.tiktok.com/open_api/v1.3' }
  let(:json) { { 'Content-Type' => 'application/json' } }

  before do
    allow(GlobalConfigService).to receive(:load).and_call_original
    allow(GlobalConfigService).to receive(:load).with('TIKTOK_APP_ID', nil).and_return('app')
    allow(GlobalConfigService).to receive(:load).with('TIKTOK_APP_SECRET', nil).and_return('secret')
    allow(Rails.logger).to receive(:error)
  end

  it 'renews a short-term access token' do
    stub_request(:post, "#{api}/tt_user/oauth2/refresh_token/")
      .with(body: { client_id: 'app', client_secret: 'secret', grant_type: 'refresh_token', refresh_token: 'r1' }.to_json)
      .to_return(headers: json, body: { code: 0, data: { access_token: 'a2', refresh_token: 'r2', expires_in: 60,
                                                         refresh_token_expires_in: 3600 } }.to_json)

    freeze_time do
      expect(described_class.renew_short_term_access_token('r1'))
        .to eq('access_token' => 'a2', 'refresh_token' => 'r2', 'expires_at' => 60.seconds.from_now,
               'refresh_token_expires_at' => 1.hour.from_now)
    end
  end

  it 'reads and updates the direct-message webhook' do
    stub_request(:get, "#{api}/business/webhook/list/")
      .with(query: { app_id: 'app', secret: 'secret', event_type: 'DIRECT_MESSAGE' })
      .to_return(headers: json, body: { code: 0, data: { callback_url: 'old' } }.to_json)
    stub_request(:post, "#{api}/business/webhook/update/")
      .with(body: hash_including('callback_url' => "#{ENV.fetch('FRONTEND_URL', 'http://localhost:3000')}/webhooks/tiktok"))
      .to_return(headers: json, body: { code: 0, data: {} }.to_json)

    expect(described_class.webhook_callback['data']).to eq('callback_url' => 'old')
    expect(described_class.update_webhook_callback['code']).to eq(0)
  end

  it 'raises with the HTTP status on a failed request' do
    stub_request(:get, "#{api}/business/webhook/list/").with(query: hash_including({})).to_return(status: 401, body: 'denied')

    expect { described_class.webhook_callback }.to raise_error('401: denied')
    expect(Rails.logger).to have_received(:error).with('Failed to fetch TikTok webhook callback. Status: 401, Body: denied')
  end
end
