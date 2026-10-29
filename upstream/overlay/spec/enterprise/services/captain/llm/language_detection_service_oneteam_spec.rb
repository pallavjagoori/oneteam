require 'rails_helper'

# OneTeam coverage for detecting a message's language for auto-translation.
# The model returns a BCP 47 tag, or `und` when it can't tell. Runs against
# a fake model.
RSpec.describe Captain::Llm::LanguageDetectionService do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) { create(:account) }

  before do
    allow(account).to receive(:feature_enabled?).and_call_original
    allow(account).to receive(:feature_enabled?).with('captain_tasks').and_return(true)
  end

  def detect(text = 'Olá, tudo bem?')
    described_class.new(account: account, text: text).language
  end

  it 'returns the detected language with minimal reasoning' do
    model_replies(json_reply(language: 'pt-BR'))

    expect(detect).to eq('pt-BR')
    expect(model_requests.last['messages'].last['content']).to eq('Olá, tudo bem?')
  end

  it 'returns nil when the model can’t tell' do
    model_replies(json_reply(language: 'und'))

    expect(detect).to be_nil
  end

  it 'logs a failed detection and returns nil' do
    stub_request(:post, fake_llm_url).to_return(status: 400, body: { error: { message: 'bad' } }.to_json)
    allow(Rails.logger).to receive(:warn)

    expect(detect).to be_nil
    expect(Rails.logger).to have_received(:warn).with(a_string_starting_with('[AutoTranslate] language detection failed:'))
  end
end
