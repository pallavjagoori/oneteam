require 'rails_helper'

# OneTeam coverage for turning WhatsApp calling on and off for an inbox
# (WhatsApp Cloud only; Meta and webhook errors come back as 422) and for a
# call setting that fails to save.
RSpec.describe 'Enterprise Inboxes API WhatsApp calling', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:channel) { create(:channel_whatsapp, account: account, provider: 'whatsapp_cloud', validate_provider_config: false, sync_templates: false) }
  let(:provider) { instance_double(Whatsapp::Providers::WhatsappCloudService, update_calling_status: true) }
  let(:webhooks) { instance_double(Whatsapp::WebhookSetupService, register_callback: true) }

  before do
    allow(Whatsapp::Providers::WhatsappCloudService).to receive(:new).and_return(provider)
    allow(Whatsapp::WebhookSetupService).to receive(:new).and_return(webhooks)
  end

  def toggle(action, inbox = channel.inbox)
    post "/api/v1/accounts/#{account.id}/inboxes/#{inbox.id}/#{action}", headers: admin.create_new_auth_token, as: :json
  end

  it 'enables calling with Meta and then disables it' do
    account.enable_features!('channel_voice')

    toggle('enable_whatsapp_calling')
    expect(response).to have_http_status(:ok)
    expect(provider).to have_received(:update_calling_status).with('ENABLED')
    expect(channel.reload.provider_config['calling_enabled']).to be(true)

    toggle('disable_whatsapp_calling')
    expect(response).to have_http_status(:ok)
    expect(channel.reload.provider_config['calling_enabled']).to be(false)
  end

  it 'returns why calling could not be enabled' do
    toggle('enable_whatsapp_calling')

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['error']).to eq('WhatsApp calling requires the channel_voice feature')
  end

  it 'returns why calling could not be disabled' do
    inbox = channel.inbox
    allow_any_instance_of(Channel::Whatsapp).to receive(:save!).and_raise(ActiveRecord::RecordNotSaved, 'locked') # rubocop:disable RSpec/AnyInstance

    toggle('disable_whatsapp_calling', inbox)

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['error']).to eq('locked')
  end

  it 'refuses inboxes that are not WhatsApp Cloud' do
    toggle('enable_whatsapp_calling', create(:inbox, account: account))
    expect(response.parsed_body['error']).to eq('Inbox does not support WhatsApp calling')

    toggle('disable_whatsapp_calling', create(:channel_whatsapp, account: account, provider: 'default', validate_provider_config: false,
                                                                 sync_templates: false).inbox)
    expect(response).to have_http_status(:unprocessable_content)
  end

  it 'returns why a call setting could not be saved' do
    allow(Twilio::VoiceWebhookSetupService).to receive(:new).and_return(instance_double(Twilio::VoiceWebhookSetupService, perform: 'AP1'))
    twilio = create(:channel_twilio_sms, :with_voice, account: account)
    allow_any_instance_of(Channel::TwilioSms).to receive(:save!).and_raise(ActiveRecord::RecordNotSaved, 'locked') # rubocop:disable RSpec/AnyInstance

    %w[set_inbound_calls set_call_recording].each do |action|
      toggle(action, twilio.inbox)
      expect(response.parsed_body['error']).to eq('locked')
    end
  end
end
