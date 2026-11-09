require 'rails_helper'

# OneTeam coverage for more account API failure branches: automation rule and
# macro updates the model rejects, API inbox secret resets, Twilio inboxes
# over the plan limit or using an API key, and WhatsApp embedded signup over
# the plan limit or on an inbox that does not need reauthorizing.
RSpec.describe 'Account API error paths, part two (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:headers) { admin.create_new_auth_token }
  let(:base) { "/api/v1/accounts/#{account.id}" }

  it 'answers 422 when an automation rule update fails validation' do
    rule = create(:automation_rule, account: account)

    patch "#{base}/automation_rules/#{rule.id}", params: { execution_delay: 1 }, headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(rule.reload.execution_delay).to be_nil
  end

  it 'answers 422 when a macro update fails validation' do
    macro = create(:macro, account: account, created_by: admin, updated_by: admin)

    patch "#{base}/macros/#{macro.id}", params: { actions: [{ action_name: 'launch_rocket', action_params: [] }] }, headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
  end

  describe 'inbox secret reset' do
    it 'resets the secret of an API inbox' do
      inbox = create(:channel_api, account: account).inbox
      old_secret = inbox.channel.secret

      post "#{base}/inboxes/#{inbox.id}/reset_secret", headers: headers, as: :json

      expect(response).to have_http_status(:success)
      expect(inbox.channel.reload.secret).not_to eq(old_secret)
    end

    it 'answers 404 for other inboxes' do
      inbox = create(:inbox, account: account)

      post "#{base}/inboxes/#{inbox.id}/reset_secret", headers: headers, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'Twilio inbox creation' do
    let(:twilio_client) { instance_double(Twilio::REST::Client) }
    let(:messages) { instance_double(Twilio::REST::Api::V2010::AccountContext::MessageList, list: []) }
    let(:params) do
      { twilio_channel: { account_sid: 'AC1', auth_token: 'tok', api_key_sid: 'SK1', phone_number: '+15550001111',
                          medium: 'sms', name: 'Twilio' } }
    end

    before do
      allow(Twilio::REST::Client).to receive(:new).and_return(twilio_client)
      allow(twilio_client).to receive(:messages).and_return(messages)
      allow(Twilio::WebhookSetupService).to receive(:new).and_return(instance_double(Twilio::WebhookSetupService, perform: true))
    end

    it 'authenticates with an API key when one is given' do
      post "#{base}/channels/twilio_channel", params: params, headers: headers, as: :json

      expect(response).to have_http_status(:success)
      expect(Twilio::REST::Client).to have_received(:new).with('SK1', 'tok', 'AC1')
    end

    it 'answers 402 when the account is over its inbox limit' do
      allow(twilio_client).to receive(:messages).and_raise(CustomExceptions::Inbox::LimitExceeded.new({}))

      post "#{base}/channels/twilio_channel", params: params, headers: headers, as: :json

      expect(response).to have_http_status(:payment_required)
    end
  end

  describe 'WhatsApp embedded signup' do
    it 'answers 402 when the account is over its inbox limit' do
      service = instance_double(Whatsapp::EmbeddedSignupService)
      allow(Whatsapp::EmbeddedSignupService).to receive(:new).and_return(service)
      allow(service).to receive(:perform).and_raise(CustomExceptions::Inbox::LimitExceeded.new({}))

      post "#{base}/whatsapp/authorization", params: { code: 'c', waba_id: 'w' }, headers: headers, as: :json

      expect(response).to have_http_status(:payment_required)
    end

    it 'refuses to reauthorize an inbox that does not need it' do
      channel = create(:channel_whatsapp, account: account, provider: 'default', sync_templates: false, validate_provider_config: false)

      post "#{base}/whatsapp/authorization", params: { code: 'c', waba_id: 'w', inbox_id: channel.inbox.id },
                                             headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['success']).to be(false)
    end
  end
end
