require 'rails_helper'

# OneTeam coverage for the "standout points" card on the Captain assistant
# Overview report: the report's stats go to the model as JSON and up to three
# short points come back. With no conversations in the period or the one
# before, the model is not called. Runs against a fake model.
RSpec.describe Captain::AssistantOverviewSummaryService do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) { create(:account) }
  let(:assistant) { create(:captain_assistant, account: account, name: 'Mia') }
  let(:service) { described_class.new(account: account, assistant: assistant, range: '30') }

  before do
    allow(Captain::OutcomeTrackingHistory).to receive(:started_at).and_return(1.year.ago)
    allow(account).to receive(:feature_enabled?).and_call_original
    allow(account).to receive(:feature_enabled?).with('captain_tasks').and_return(true)
  end

  def handled_conversation
    create(:conversation_outcome, account: account, assistant: assistant, started_at: 2.days.ago,
                                  first_captain_reply_at: 2.days.ago + 1.minute)
  end

  it 'returns no points without calling the model when there was no activity' do
    expect(service.perform).to eq(points: [])
    expect(a_request(:post, fake_llm_url)).not_to have_been_made
  end

  context 'with activity' do
    before { handled_conversation }

    it 'returns up to three trimmed, non-empty points' do
      model_replies(json_reply(points: [' Handoffs fell. ', '', 'Reopens rose.', 'Volume doubled.', 'Extra']))

      expect(service.perform).to eq(points: ['Handoffs fell.', 'Reopens rose.', 'Volume doubled.'])
    end

    it 'sends the report data with the assistant’s name and language' do
      model_replies(json_reply(points: []))

      service.perform

      system_prompt = model_requests.last['messages'].first['content']
      expect(system_prompt).to include('Mia', account.locale_english_name, '"conversations_handled"', '"resolution_flow"',
                                       '"resolution_trend"')
      expect(model_requests.last['messages'].last['content']).to eq('Identify the standout points in this report.')
      expect(model_requests.last.dig('response_format', 'type')).to eq('json_schema')
    end

    it 'returns no points for an unreadable reply' do
      model_replies(completion({ role: 'assistant', content: '' }, 'stop'))

      expect(service.perform).to eq(points: [])
    end

    it 'passes a model error through' do
      stub_request(:post, fake_llm_url).to_return(status: 400, body: { error: { message: 'bad request' } }.to_json)

      expect(service.perform).to include(:error)
    end
  end
end
