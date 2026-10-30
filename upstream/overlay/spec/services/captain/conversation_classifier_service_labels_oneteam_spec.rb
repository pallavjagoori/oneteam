require 'rails_helper'

# OneTeam coverage for Captain's label suggestions: each account label the
# conversation does not have yet becomes a yes/no question for the classifier
# model, and up to three labels it is at least 50% sure of are suggested.
RSpec.describe Captain::ConversationClassifierService do
  let(:account) { create(:account) }
  let(:conversation) { create(:conversation, account: account) }
  let(:endpoint) { 'https://openrouter.ai/api/v1/systemone' }
  let(:service) { described_class.new(conversation: conversation) }

  before do
    allow(GlobalConfigService).to receive(:load).with('CAPTAIN_OPENROUTER_DECISION_MODEL_ENDPOINT', nil)
                                                .and_return('https://openrouter.ai/api')
    allow(GlobalConfigService).to receive(:load).with('CAPTAIN_OPENROUTER_API_KEY', nil).and_return('test-key')
  end

  it 'suggests the most likely labels above the threshold' do
    %w[billing refund shipping bug onboarding].each { |title| create(:label, account: account, title: title) }
    conversation.update_labels(['onboarding'])
    probabilities = { 'billing' => 0.9, 'refund' => 0.7, 'shipping' => 0.2, 'bug' => 0.6 }
    stub_request(:post, endpoint).to_return do |request|
      questions = JSON.parse(request.body)['questions']
      answers = questions.transform_values do |question|
        { 'type' => 'noul', 'noul' => probabilities.fetch(question['instructions']['label']['name']) }
      end
      { status: 200, body: { answers: answers }.to_json, headers: { 'Content-Type' => 'application/json' } }
    end

    expect(service.labels).to eq([{ title: 'billing', probability: 0.9 }, { title: 'refund', probability: 0.7 }, { title: 'bug', probability: 0.6 }])
  end

  it 'asks nothing when every label is already applied' do
    expect(service.labels).to eq([])
  end
end
