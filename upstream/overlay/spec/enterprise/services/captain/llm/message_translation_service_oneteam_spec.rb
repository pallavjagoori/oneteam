require 'rails_helper'

# OneTeam coverage for translating one conversation message, against a fake
# model: the target language is named in full in the prompt, and control
# characters are stripped from the translation.
RSpec.describe Captain::Llm::MessageTranslationService do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) { create(:account) }

  before do
    allow(account).to receive(:feature_enabled?).and_call_original
    allow(account).to receive(:feature_enabled?).with('captain_tasks').and_return(true)
  end

  def translate(target = 'pt-BR')
    described_class.new(account: account, text: 'Hello', target_language: target).perform
  end

  it 'returns the translation without control characters' do
    model_replies(json_reply(translation: "Ol\u0007á"))

    expect(translate[:message]).to eq('Olá')
    expect(model_requests.last['messages'].first['content']).to include("into #{described_class::LANGUAGE_NAMES['pt_BR']}.")
  end

  it 'uses the code itself for a language it has no name for' do
    model_replies(json_reply(translation: 'x'))

    translate('xx-YY')

    expect(model_requests.last['messages'].first['content']).to include('into xx-YY.')
  end

  it 'passes a model error through' do
    stub_request(:post, fake_llm_url).to_return(status: 400, body: { error: { message: 'bad' } }.to_json)

    expect(translate).to include(:error)
  end

  it 'compares languages by their base code' do
    expect(described_class.same_language?('pt-BR', 'pt_PT')).to be(true)
    expect(described_class.same_language?('pt', 'es')).to be(false)
  end
end
