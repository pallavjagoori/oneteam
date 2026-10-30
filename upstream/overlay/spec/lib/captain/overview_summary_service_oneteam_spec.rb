require 'rails_helper'

# OneTeam coverage for the welcome summary on the Captain assistant page: the
# assistant's stats and reporting period fill the captain_overview_summary
# prompt, and the model's Markdown comes back as is. Runs against a fake model.
RSpec.describe Captain::OverviewSummaryService do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) { create(:account, locale: 'de') }
  let(:assistant) { create(:captain_assistant, account: account, name: 'Mia') }
  let(:stats) do
    { conversations_handled: { current: 1248 }, hours_saved: { current: 612 },
      auto_resolution_rate: { current: 63.2, trend: 4.1 }, handoff_rate: { current: 20.5, trend: -2 },
      reopen_rate: { current: 3, trend: 0 }, knowledge: { coverage: 90, approved: 45, documents: 7 } }
  end
  let(:period) { { label: 'the last 30 days', starts_on: Date.new(2026, 9, 1), ends_on: Date.new(2026, 9, 30) } }
  let(:service) { described_class.new(account: account, assistant: assistant, first_name: 'Ada', stats: stats, period: period) }

  before do
    allow(account).to receive(:feature_enabled?).and_call_original
    allow(account).to receive(:feature_enabled?).with('captain_tasks').and_return(true)
  end

  # RubyLLM sends the system prompt with the `developer` role.
  def system_prompt
    model_requests.last['messages'].find { |message| message['role'] == 'developer' }['content']
  end

  it 'returns the model’s Markdown' do
    model_replies(completion({ role: 'assistant', content: 'Hallo Ada, Mia hat **1.200** Gespräche geführt.' }, 'stop'))

    expect(service.perform).to eq(message: 'Hallo Ada, Mia hat **1.200** Gespräche geführt.')
  end

  it 'fills the prompt with the names, language, stats and period' do
    model_replies(completion({ role: 'assistant', content: 'Hi' }, 'stop'))

    travel_to(Date.new(2026, 10, 2)) { service.perform }

    expect(system_prompt).to include('named "Mia"', 'for Ada,', "Write the entire summary in #{account.locale_english_name}.",
                                     'Conversations handled: 1248.', 'Hours saved: 612 hours.',
                                     'Auto-resolution rate: 63.2% (4.1 points', 'Handoff rate: 20.5% (-2 points',
                                     'Reopen-after-resolve rate: 3% (0 points', '45 approved FAQ answers, 7 documents, 90% coverage',
                                     'today is October 2, 2026', 'the last 30 days (September 1, 2026 to September 30, 2026)')
    expect(model_requests.last['messages'].last).to include('content' => 'Write the summary.')
  end

  it 'leaves stats it was not given blank' do
    stats.clear
    model_replies(completion({ role: 'assistant', content: 'Hi' }, 'stop'))

    service.perform

    expect(system_prompt).to include('Conversations handled: .', 'Hours saved:  hours.')
  end

  it 'uses the account’s own OpenAI key when it has the OpenAI integration' do
    # Saving the hook checks the key against the models endpoint.
    stub_request(:get, 'https://llm.example.com/v1/models').to_return(status: 200, body: { data: [] }.to_json)
    create(:integrations_hook, :openai, account: account, settings: { 'api_key' => 'sk-account' })
    model_replies(completion({ role: 'assistant', content: 'Hi' }, 'stop'))

    service.perform

    expect(a_request(:post, fake_llm_url).with(headers: { 'Authorization' => 'Bearer sk-account' })).to have_been_made
  end

  it 'passes a model error through' do
    stub_request(:post, fake_llm_url).to_return(status: 400, body: { error: { message: 'bad request' } }.to_json)

    expect(service.perform).to include(:error)
  end
end
