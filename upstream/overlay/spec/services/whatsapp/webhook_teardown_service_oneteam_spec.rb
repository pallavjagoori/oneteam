require 'rails_helper'

# OneTeam coverage for removing an embedded-signup WhatsApp number's webhooks
# when its inbox is deleted: each step's errors are logged without blocking
# the delete, and the WABA subscription stays while another inbox uses it.
RSpec.describe Whatsapp::WebhookTeardownService do
  let(:channel) { create(:channel_whatsapp, provider: 'whatsapp_cloud', sync_templates: false, validate_provider_config: false) }
  let(:api_client) do
    instance_double(Whatsapp::FacebookApiClient, clear_phone_number_callback_override: true,
                                                 deregister_phone_number: true, unsubscribe_app_from_waba: true)
  end

  before do
    channel.update_column(:provider_config, { 'api_key' => 'key', 'phone_number_id' => 'phone-1', 'business_account_id' => 'waba-1', # rubocop:disable Rails/SkipsModelValidations
                                              'source' => 'embedded_signup' })
    allow(Whatsapp::FacebookApiClient).to receive(:new).and_return(api_client)
    allow(Rails.logger).to receive(:error)
  end

  it 'clears the webhook, releases the number and unsubscribes the app' do
    described_class.new(channel).perform

    expect(api_client).to have_received(:deregister_phone_number).with('phone-1')
    expect(api_client).to have_received(:unsubscribe_app_from_waba).with('waba-1')
  end

  it 'keeps the WABA subscription while another inbox uses it' do
    other = create(:channel_whatsapp, sync_templates: false, validate_provider_config: false)
    other.update_column(:provider_config, { 'business_account_id' => 'waba-1' }) # rubocop:disable Rails/SkipsModelValidations

    described_class.new(channel).perform

    expect(api_client).not_to have_received(:unsubscribe_app_from_waba)
  end

  it 'logs failed steps and carries on' do
    allow(api_client).to receive(:deregister_phone_number).and_raise(StandardError, 'gone')
    allow(api_client).to receive(:unsubscribe_app_from_waba).and_raise(StandardError, 'denied')

    described_class.new(channel).perform

    expect(Rails.logger).to have_received(:error).with(/Phone deregistration failed.*gone/)
    expect(Rails.logger).to have_received(:error).with(/WABA app unsubscribe failed.*denied/)
  end

  it 'logs a failure before any step runs' do
    allow(Whatsapp::FacebookApiClient).to receive(:new).and_raise(StandardError, 'no client')

    described_class.new(channel).perform

    expect(Rails.logger).to have_received(:error).with(/Webhook teardown failed for channel #{channel.id}: no client/)
  end
end
