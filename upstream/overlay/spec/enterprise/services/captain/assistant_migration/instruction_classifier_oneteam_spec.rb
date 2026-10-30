require 'rails_helper'

# OneTeam coverage for migrating an old free-text Captain assistant to the
# structured format. A first model call sorts the old instructions into
# guidelines, guardrails, scenarios, FAQs and items needing review; a second
# (InstructionAuditor) adds anything the first missed. Runs against a fake
# model that answers both calls in turn.
RSpec.describe Captain::AssistantMigration::InstructionClassifier do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) { create(:account, name: 'Acme') }
  let(:assistant) do
    create(:captain_assistant, account: account, name: 'Mia', description: 'Support bot',
                               config: { 'instructions' => 'Be kind. Never promise refunds.', 'welcome_message' => 'Hi!',
                                         'feature_faq' => true, 'temperature' => 0.3 })
  end
  let(:classifier) { described_class.new(assistant: assistant) }
  let(:draft) { { response_guidelines: ['Be kind'], guardrails: [], business_product_context: ['Rockets'] } }

  def classifier_request
    JSON.parse(model_requests.first['messages'].last['content'])
  end

  it 'returns the assistant, the audited draft and the combined usage of both calls' do
    model_replies(json_reply(draft), json_reply(guardrails: ['Never promise refunds'], response_guidelines: ['Be kind']))

    result = classifier.perform

    expect(result[:draft]).to include(response_guidelines: ['Be kind'], guardrails: ['Never promise refunds'],
                                      business_product_context: ['Rockets'], scenario_candidates: [],
                                      conversation_messages: {}, faq_document_candidates: [], needs_review: [])
    expect(result[:usage]).to eq('prompt_tokens' => 20, 'completion_tokens' => 10, 'total_tokens' => 30)
    expect(result[:assistant]).to include(name: 'Mia', account_name: 'Acme', inbox_count: 0, welcome_message: 'Hi!',
                                          original_instructions: 'Be kind. Never promise refunds.', handoff_message: '')
    expect(result[:request_messages].first[:role]).to eq('system')
  end

  it 'sends the assistant’s settings, scenarios and tools to the classifier' do
    create(:captain_scenario, assistant: assistant, account: account, title: 'Refunds')
    model_replies(json_reply(draft), json_reply({}))

    classifier.perform

    expect(model_requests.first['model']).to eq('gpt-5.2')
    expect(classifier_request).to include('name' => 'Mia', 'account_name' => 'Acme', 'instructions' => 'Be kind. Never promise refunds.',
                                          'feature_settings' => { 'feature_faq' => true, 'temperature' => 0.3 })
    expect(classifier_request['existing_scenarios'].pluck('title')).to eq(['Refunds'])
    expect(classifier_request['available_agent_tools'].first.keys).to eq(%w[id title description])
  end

  it 'truncates very long instructions' do
    assistant.update!(config: assistant.config.merge('instructions' => 'x' * 20_001))
    model_replies(json_reply(draft), json_reply({}))

    classifier.perform

    expect(classifier_request['instructions']).to eq("#{'x' * 20_000}\n\n[TRUNCATED]")
  end

  it 'tells the auditor how much room each section has left' do
    auditor = instance_double(Captain::AssistantMigration::InstructionAuditor, perform: { message: {} })
    allow(Captain::AssistantMigration::InstructionAuditor).to receive(:new).and_return(auditor)
    model_replies(json_reply(draft))

    classifier.perform

    room = { response_guidelines: 19, guardrails: 20, scenario_candidates: 15, faq_document_candidates: 25, needs_review: 20 }
    expect(Captain::AssistantMigration::InstructionAuditor).to have_received(:new).with(hash_including(available_additions: room))
  end

  it 'reports an error when the audit would overflow a section' do
    model_replies(json_reply(draft), json_reply(guardrails: (1..21).map { |n| "Rule #{n}" }))

    result = classifier.perform

    expect(result).to include(error: 'Audited guardrails exceeds 20 items')
    expect(result[:assistant]).to include(name: 'Mia')
  end

  it 'treats an unreadable classifier reply as an empty draft' do
    model_replies(completion({ role: 'assistant', content: '' }, 'stop'), json_reply({}))

    expect(classifier.perform[:draft]).to include(response_guidelines: [], guardrails: [])
  end

  it 'returns the classifier’s error without auditing' do
    stub_request(:post, fake_llm_url).to_return(status: 400, body: { error: { message: 'bad request' } }.to_json)

    result = classifier.perform

    expect(result).to include(:error, assistant: a_hash_including(name: 'Mia'))
    expect(a_request(:post, fake_llm_url)).to have_been_made.once
  end

  it 'returns the auditor’s error' do
    allow(Captain::AssistantMigration::InstructionAuditor).to receive(:new)
      .and_return(instance_double(Captain::AssistantMigration::InstructionAuditor, perform: { error: 'audit failed', error_code: 500 }))
    model_replies(json_reply(draft))

    expect(classifier.perform).to include(error: 'audit failed', error_code: 500)
  end
end
