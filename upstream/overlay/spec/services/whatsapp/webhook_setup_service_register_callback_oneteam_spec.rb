require 'rails_helper'

# OneTeam coverage for re-registering the webhook callback without touching
# the phone number registration.
RSpec.describe Whatsapp::WebhookSetupService do
  it 'validates and subscribes the webhook' do
    channel = instance_double(Channel::Whatsapp, provider_config: { 'phone_number_id' => 'pn1', 'webhook_verify_token' => 'vt' })
    api_client = instance_double(Whatsapp::FacebookApiClient, subscribe_phone_number_webhook: true)
    allow(Whatsapp::FacebookApiClient).to receive(:new).with('tok').and_return(api_client)
    service = described_class.new(channel, 'waba1', 'tok')
    allow(service).to receive_messages(build_callback_url: 'https://app.example/webhooks/whatsapp/+1', subscribed_fields: %w[messages])

    service.register_callback

    expect(api_client).to have_received(:subscribe_phone_number_webhook)
      .with('waba1', 'pn1', 'https://app.example/webhooks/whatsapp/+1', 'vt', subscribed_fields: %w[messages])
  end
end
