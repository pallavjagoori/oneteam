require 'rails_helper'
require 'google/cloud/translate/v3'

# OneTeam coverage for auto-translation through Google Translate, when the
# account picks it over Captain: an empty translation counts as none, and a
# Google error is logged and treated as no result.
RSpec.describe Captain::Conversation::TranslatorService do
  let(:account) { create(:account) }
  let(:google) { instance_double(Integrations::GoogleTranslate::ProcessorService) }
  let(:service) { described_class.new(account: account) }

  before do
    allow(account).to receive(:translation_service).and_return('google_translate')
    allow(Integrations::GoogleTranslate::ProcessorService).to receive(:new).and_return(google)
    allow(Rails.logger).to receive(:warn)
  end

  it 'translates and detects with the account’s Google Translate hook' do
    allow(google).to receive_messages(translate: 'Hola', detect: 'en')

    expect(service.translate('Hello', 'es')).to eq('Hola')
    expect(service.language('Hello')).to eq('en')
    expect(Integrations::GoogleTranslate::ProcessorService).to have_received(:new).with(hook: account.google_translate_hook).once
  end

  it 'treats an empty translation as none' do
    allow(google).to receive(:translate).and_return('')

    expect(service.translate('Hello', 'es')).to be_nil
  end

  it 'logs Google errors and returns nil' do
    allow(google).to receive(:translate).and_raise(Google::Cloud::Error, 'quota')
    allow(google).to receive(:detect).and_raise(Google::Cloud::Error, 'quota')

    expect(service.translate('Hello', 'es')).to be_nil
    expect(service.language('Hello')).to be_nil
    expect(Rails.logger).to have_received(:warn).with('[AutoTranslate] Google translation failed: quota')
    expect(Rails.logger).to have_received(:warn).with('[AutoTranslate] Google language detection failed: quota')
  end

  it 'uses Captain’s own services for the default provider' do
    allow(account).to receive(:translation_service).and_return('captain')
    translation = instance_double(Captain::Llm::MessageTranslationService, perform: { message: '' })
    detection = instance_double(Captain::Llm::LanguageDetectionService, language: 'fr')
    allow(Captain::Llm::MessageTranslationService).to receive(:new).and_return(translation)
    allow(Captain::Llm::LanguageDetectionService).to receive(:new).and_return(detection)

    expect(described_class.new(account: account, conversation_display_id: 7).translate('Hello', 'es')).to be_nil
    expect(service.language('Bonjour')).to eq('fr')
    expect(Captain::Llm::MessageTranslationService).to have_received(:new)
      .with(account: account, text: 'Hello', target_language: 'es', conversation_display_id: 7)
  end
end
