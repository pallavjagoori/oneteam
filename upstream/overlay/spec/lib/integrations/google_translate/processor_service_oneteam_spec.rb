require 'rails_helper'
require 'google/cloud/translate/v3'

# OneTeam coverage for the Google Cloud Translation client behind the
# Google Translate integration: message translation (emails are translated
# from their HTML or plain-text body) and language detection.
RSpec.describe Integrations::GoogleTranslate::ProcessorService do
  let(:account) { create(:account) }
  let(:hook) do
    create(:integrations_hook, :google_translate, account: account, settings: { 'project_id' => 'proj', 'credentials' => { 'k' => 'v' } })
  end
  let(:client) { instance_double(Google::Cloud::Translate::V3::TranslationService::Client) }
  let(:client_config) { Struct.new(:credentials).new }
  let(:service) { described_class.new(hook: hook) }

  before do
    allow(Integrations::GoogleTranslate::CredentialsValidator).to receive(:valid?).and_return(true)
    allow(Google::Cloud::Translate::V3::TranslationService::Client).to receive(:new).and_yield(client_config).and_return(client)
    allow(client).to receive(:translate_text).and_return(
      Google::Cloud::Translate::V3::TranslateTextResponse.new(translations: [{ translated_text: 'Bonjour' }])
    )
  end

  def translated_with
    arguments = nil
    expect(client).to have_received(:translate_text) { |args| arguments = args }
    arguments
  end

  describe '#translate' do
    it 'translates with the hook’s project and credentials, using a BCP-47 language code' do
      expect(service.translate('Hello', 'pt_BR')).to eq('Bonjour')
      expect(translated_with).to eq(contents: ['Hello'], target_language_code: 'pt-BR', parent: 'projects/proj', mime_type: 'text/plain')
      expect(client_config.credentials).to eq('k' => 'v')
    end

    it 'returns nil when Google sends no translation' do
      allow(client).to receive(:translate_text).and_return(Google::Cloud::Translate::V3::TranslateTextResponse.new)

      expect(service.translate('Hello', 'fr')).to be_nil
    end
  end

  describe '#translate_message' do
    let(:email_inbox) { create(:channel_email, account: account).inbox }

    def email_message(email)
      create(:message, account: account, inbox: email_inbox, content: 'Plain', content_attributes: { email: email })
    end

    it 'translates a chat message’s text' do
      service.translate_message(create(:message, account: account, content: 'Hi'), 'fr')

      expect(translated_with).to include(contents: ['Hi'], mime_type: 'text/plain')
    end

    it 'translates an email from its full HTML' do
      service.translate_message(email_message('html_content' => { 'full' => '<p>Hi</p>' }), 'fr')

      expect(translated_with).to include(contents: ['<p>Hi</p>'], mime_type: 'text/html')
    end

    it 'translates a plain-text email from its full text' do
      service.translate_message(email_message('content_type' => 'text/plain', 'text_content' => { 'full' => 'Hi there' }), 'fr')

      expect(translated_with).to include(contents: ['Hi there'], mime_type: 'text/plain')
    end

    it 'falls back to the message content for other emails' do
      service.translate_message(email_message('content_type' => 'multipart/mixed'), 'fr')

      expect(translated_with).to include(contents: ['Plain'])
    end

    it 'does nothing for an empty message' do
      expect(service.translate_message(create(:message, account: account, content: ''), 'fr')).to be_nil
      expect(client).not_to have_received(:translate_text)
    end
  end

  describe '#detect' do
    def detected(code)
      allow(client).to receive(:detect_language).and_return(
        Google::Cloud::Translate::V3::DetectLanguageResponse.new(languages: code ? [{ language_code: code }] : [])
      )
      service.detect('x' * 2000)
    end

    it 'returns the language code, sending at most 1,500 characters' do
      expect(detected('es')).to eq('es')
      expect(client).to have_received(:detect_language).with(content: 'x' * 1500, parent: 'projects/proj')
    end

    it 'returns nil for an undetermined or missing language' do
      expect(detected('und')).to be_nil
      expect(detected(nil)).to be_nil
    end
  end
end
