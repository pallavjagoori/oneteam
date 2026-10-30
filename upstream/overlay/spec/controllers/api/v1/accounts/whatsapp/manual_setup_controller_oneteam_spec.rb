require 'rails_helper'

# OneTeam coverage for the WhatsApp manual setup API (version 2), where an
# admin pastes a WABA ID, phone number ID and token instead of using embedded
# signup. The services behind it have their own specs; here they are doubles,
# so these examples pin the routes, permissions and response shapes.
RSpec.describe 'WhatsApp manual setup API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/whatsapp/manual" }
  let(:credentials) { { waba_id: 'waba-1', phone_number_id: 'phone-1', access_token: 'token' } }
  let(:status_body) { { callback_verified: true, callback_configured: true, callback_url: 'url', subscription_verified: true } }

  def manual_inbox(source: 'manual_setup_v2')
    channel = create(:channel_whatsapp, account: account, provider: 'whatsapp_cloud', sync_templates: false, validate_provider_config: false,
                                        provider_config: { 'api_key' => 'token', 'phone_number_id' => 'phone-1', 'source' => source })
    channel.inbox
  end

  describe 'POST /manual/preview' do
    it 'returns the validated number preview' do
      validator = instance_double(Whatsapp::ManualSetupValidationService, perform: { verified_name: 'Acme' })
      allow(Whatsapp::ManualSetupValidationService).to receive(:new).with(**credentials).and_return(validator)

      post "#{base_url}/preview", params: credentials, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq('verified_name' => 'Acme')
    end

    it 'returns the validation message as 422' do
      validator = instance_double(Whatsapp::ManualSetupValidationService)
      allow(validator).to receive(:perform).and_raise(ArgumentError, 'WABA ID is required')
      allow(Whatsapp::ManualSetupValidationService).to receive(:new).and_return(validator)

      post "#{base_url}/preview", params: credentials, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq('message' => 'WABA ID is required')
    end

    it 'does not let agents create inboxes' do
      post "#{base_url}/preview", params: credentials, headers: agent.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'POST /manual/connect' do
    let(:inbox) { manual_inbox }
    let(:setup) { instance_double(Whatsapp::ManualSetupService, channel: inbox.channel, webhook_setup?: false, webhook_error: 'No callback') }

    it 'creates the inbox and reports the webhook result' do
      allow(Whatsapp::ManualSetupService).to receive(:new)
        .with(account: account, **credentials, inbox_name: 'Support')
        .and_return(instance_double(Whatsapp::ManualSetupService, perform: setup))

      post "#{base_url}/connect", params: credentials.merge(inbox_name: 'Support'), headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to eq(
        'id' => inbox.id, 'name' => inbox.name, 'number_access' => true, 'template_access' => true,
        'webhook_setup' => false, 'webhook_error' => 'No callback'
      )
    end

    it 'returns 402 when the account has no inboxes left on its plan' do
      service = instance_double(Whatsapp::ManualSetupService)
      allow(service).to receive(:perform).and_raise(CustomExceptions::Inbox::LimitExceeded.new({}))
      allow(Whatsapp::ManualSetupService).to receive(:new).and_return(service)

      post "#{base_url}/connect", params: credentials, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:payment_required)
      expect(response.parsed_body['error']).to eq('Account limit exceeded. Upgrade to a higher plan')
    end

    it 'returns other failures as 422' do
      service = instance_double(Whatsapp::ManualSetupService)
      allow(service).to receive(:perform).and_raise(ArgumentError, 'Already connected')
      allow(Whatsapp::ManualSetupService).to receive(:new).and_return(service)

      post "#{base_url}/connect", params: credentials, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq('message' => 'Already connected')
    end
  end

  describe 'GET /manual/:inbox_id/webhook_status' do
    it 'returns the webhook status of a manual-setup inbox' do
      inbox = manual_inbox
      status_service = instance_double(Whatsapp::ManualWebhookStatusService, perform: status_body)
      allow(Whatsapp::ManualWebhookStatusService).to receive(:new).with(inbox.channel).and_return(status_service)

      get "#{base_url}/#{inbox.id}/webhook_status", headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq(status_body.stringify_keys)
    end

    it 'returns a Meta error as 422' do
      inbox = manual_inbox
      service = instance_double(Whatsapp::ManualWebhookStatusService)
      allow(service).to receive(:perform).and_raise(StandardError, 'Invalid token')
      allow(Whatsapp::ManualWebhookStatusService).to receive(:new).and_return(service)

      get "#{base_url}/#{inbox.id}/webhook_status", headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq('message' => 'Invalid token')
    end

    it 'treats inboxes made by embedded signup as not found' do
      inbox = manual_inbox(source: 'embedded_signup')

      get "#{base_url}/#{inbox.id}/webhook_status", headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:not_found)
    end

    it 'treats inboxes of other channels as not found' do
      inbox = create(:inbox, account: account)

      get "#{base_url}/#{inbox.id}/webhook_status", headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'POST /manual/:inbox_id/setup_webhook' do
    let(:inbox) { manual_inbox }
    let(:webhook_setup) { instance_double(Whatsapp::WebhookSetupService, perform: true, registration_error: nil) }

    before { allow(Whatsapp::WebhookSetupService).to receive(:new).with(inbox.channel).and_return(webhook_setup) }

    it 'registers the webhook and returns the new status' do
      allow(Whatsapp::ManualWebhookStatusService).to receive(:new)
        .and_return(instance_double(Whatsapp::ManualWebhookStatusService, perform: status_body))

      post "#{base_url}/#{inbox.id}/setup_webhook", headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['callback_configured']).to be(true)
    end

    it 'returns a registration error as 422' do
      allow(webhook_setup).to receive(:registration_error).and_return(StandardError.new('Callback rejected'))

      post "#{base_url}/#{inbox.id}/setup_webhook", headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq('message' => 'Callback rejected')
    end
  end
end
