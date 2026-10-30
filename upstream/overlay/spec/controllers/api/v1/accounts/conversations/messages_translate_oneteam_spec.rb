require 'rails_helper'

# OneTeam coverage for translating a message on request and for retrying a
# failed one. A translation is stored on the message per language (and not
# fetched again), Google Translate is used when the account picks it and
# has the integration, and Google errors come back as a 422. Retrying a
# failed message on a channel inbox clears its old provider id first.
RSpec.describe 'Message translate and retry', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :administrator) }
  let(:conversation) { create(:conversation, account: account) }
  let(:message) { create(:message, conversation: conversation, account: account, inbox: conversation.inbox, content: 'Hola') }
  let(:headers) { agent.create_new_auth_token }
  let(:processor) { instance_double(Integrations::GoogleTranslate::ProcessorService) }

  def translate(language = 'en')
    post "/api/v1/accounts/#{account.id}/conversations/#{conversation.display_id}/messages/#{message.id}/translate",
         params: { target_language: language }, headers: headers, as: :json
  end

  before do
    allow(Integrations::GoogleTranslate::CredentialsValidator).to receive(:valid?).and_return(true)
    account.update!(translation_provider: 'google_translate')
    create(:integrations_hook, :google_translate, account: account)
    allow(Integrations::GoogleTranslate::ProcessorService).to receive(:new).and_return(processor)
  end

  it 'stores each translation alongside earlier ones' do
    allow(processor).to receive(:translate_message).and_return('Hello', 'Bonjour')

    translate('en')
    expect(response.parsed_body).to eq('content' => 'Hello')
    translate('fr')

    expect(message.reload.translations).to eq('en' => 'Hello', 'fr' => 'Bonjour')
    expect(message.translation_provider).to eq('google_translate')
  end

  it 'does not translate again into a language it already has' do
    message.update!(translations: { 'en' => 'Hello' })
    expect(processor).not_to receive(:translate_message)

    translate('en')

    expect(response).to have_http_status(:ok)
  end

  it 'saves nothing when the integration returns no text' do
    allow(processor).to receive(:translate_message).and_return(nil)

    translate

    expect(response.parsed_body).to eq('content' => nil)
    expect(message.reload.translations).to be_blank
  end

  it 'returns Google errors as a 422' do
    allow(processor).to receive(:translate_message).and_raise(Google::Cloud::InvalidArgumentError.new('Bad language'))

    translate('xx')

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['error']).to eq('Bad language')
  end

  context 'with a channel inbox' do
    let(:conversation) { create(:conversation, account: account, inbox: create(:channel_twilio_sms, account: account).inbox) }

    it 'clears the old provider id before retrying a failed message' do
      message.update!(status: :failed, source_id: 'old-id')

      expect do
        post "/api/v1/accounts/#{account.id}/conversations/#{conversation.display_id}/messages/#{message.id}/retry", headers: headers, as: :json
      end.to have_enqueued_job(SendReplyJob).with(message.id)

      expect(message.reload).to have_attributes(status: 'sent', source_id: nil)
    end
  end
end
