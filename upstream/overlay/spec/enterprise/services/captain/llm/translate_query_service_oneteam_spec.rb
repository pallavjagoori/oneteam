require 'rails_helper'

# OneTeam coverage for translating a knowledge base search query into the
# account's language before searching. A query already in that language is
# meant to be left alone (see below); any failure falls back to the original query. Runs against a
# fake model.
RSpec.describe Captain::Llm::TranslateQueryService do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) { create(:account, locale: 'fr') }
  let(:service) { described_class.new(account: account) }
  let(:query) { 'Where can I find my latest invoice for the subscription?' }

  before do
    allow(account).to receive(:feature_enabled?).and_call_original
    allow(account).to receive(:feature_enabled?).with('captain_tasks').and_return(true)
  end

  it 'translates a query in another language' do
    model_replies(completion({ role: 'assistant', content: " Où trouver ma dernière facture ?\n" }, 'stop'))

    expect(service.translate(query, target_language: 'French')).to eq('Où trouver ma dernière facture ?')
    expect(model_requests.last['messages'].first['content']).to include('Translate the query to French.')
  end

  # CLD3 returns the language as a symbol (:fr) and the service compares it
  # with the locale string ('fr'), so the shortcut never applies (FINDINGS.md).
  it 'still asks the model when the query is already in the account’s language' do
    french = 'Où puis-je trouver ma dernière facture pour mon abonnement ?'
    model_replies(completion({ role: 'assistant', content: french }, 'stop'))

    expect(service.translate(french, target_language: 'French')).to eq(french)
    expect(a_request(:post, fake_llm_url)).to have_been_made
  end

  it 'falls back to the original query when the model fails' do
    stub_request(:post, fake_llm_url).to_return(status: 400, body: { error: { message: 'bad' } }.to_json)

    expect(service.translate(query, target_language: 'French')).to eq(query)
  end

  it 'falls back to the original query on any other error, logging it' do
    allow(service).to receive(:make_api_call).and_raise('boom')
    allow(Rails.logger).to receive(:warn)

    expect(service.translate(query, target_language: 'French')).to eq(query)
    expect(Rails.logger).to have_received(:warn).with('TranslateQueryService failed: boom, falling back to original query')
  end

  it 'translates when language detection itself fails' do
    allow(CLD3::NNetLanguageIdentifier).to receive(:new).and_raise('no model')
    model_replies(completion({ role: 'assistant', content: 'Facture' }, 'stop'))

    expect(service.translate('Facture', target_language: 'French')).to eq('Facture')
    expect(a_request(:post, fake_llm_url)).to have_been_made
  end
end
