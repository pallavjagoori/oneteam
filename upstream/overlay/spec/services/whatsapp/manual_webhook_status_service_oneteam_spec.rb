require 'rails_helper'

# OneTeam coverage for the webhook status shown after manual setup: whether
# Meta sends this number's events to Chatwoot's callback URL (at any of the
# levels Meta allows), and whether the app is subscribed to the WABA.
RSpec.describe Whatsapp::ManualWebhookStatusService do
  subject(:status) { described_class.new(channel).perform }

  let(:channel) do
    create(:channel_whatsapp, phone_number: '+15550102000', sync_templates: false, validate_provider_config: false,
                              provider_config: { 'api_key' => 'token', 'phone_number_id' => 'phone-1', 'business_account_id' => 'waba-1' })
  end
  let(:api_client) { instance_double(Whatsapp::FacebookApiClient) }
  let(:callback_url) { 'https://app.example.com/webhooks/whatsapp/+15550102000' }

  around do |example|
    with_modified_env(FRONTEND_URL: 'https://app.example.com') { example.run }
  end

  before do
    allow(Whatsapp::FacebookApiClient).to receive(:new).with('token').and_return(api_client)
    allow(api_client).to receive(:fetch_subscribed_apps).with('waba-1').and_return('data' => [{ 'id' => 'app' }])
  end

  %w[override_callback_uri phone_number whatsapp_business_account application].each do |level|
    it "sees the callback configured at the #{level} level" do
      allow(api_client).to receive(:fetch_phone_number)
        .with('phone-1', fields: 'webhook_configuration')
        .and_return('webhook_configuration' => { level => callback_url })

      expect(status).to eq(callback_verified: true, callback_configured: true, callback_url: callback_url, subscription_verified: true)
    end
  end

  it 'reports a missing callback and subscription' do
    allow(api_client).to receive_messages(fetch_phone_number: {}, fetch_subscribed_apps: {})

    expect(status).to include(callback_configured: false, subscription_verified: false)
  end
end
