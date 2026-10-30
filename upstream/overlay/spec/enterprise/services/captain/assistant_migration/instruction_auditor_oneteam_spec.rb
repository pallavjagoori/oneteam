require 'rails_helper'

# OneTeam coverage for the check that runs after an old assistant is migrated:
# a second model call compares the source assistant with the generated draft
# and returns only what the draft missed, within the room still left in each
# section. Runs against a fake model.
RSpec.describe Captain::AssistantMigration::InstructionAuditor do
  include_context 'with a fake OpenAI-compatible model'

  let(:assistant) { create(:captain_assistant) }
  let(:available) do
    { response_guidelines: 12, guardrails: 0, needs_review: 3, scenario_candidates: 7, faq_document_candidates: 2 }
  end
  let(:auditor) do
    described_class.new(assistant: assistant, source_payload: { instructions: 'Be kind' }, draft: { guardrails: [] },
                        available_additions: available)
  end
  let(:request) { model_requests.last }
  let(:schema) { request.dig('response_format', 'json_schema', 'schema') }

  before { model_replies(json_reply(response_guidelines: ['Greet by name'])) }

  it 'returns what the model says the draft missed' do
    expect(auditor.perform[:message]).to eq('response_guidelines' => ['Greet by name'])
  end

  it 'always uses gpt-5.2 and sends the source, the draft and the room left as JSON' do
    auditor.perform

    expect(request['model']).to eq('gpt-5.2')
    expect(JSON.parse(request['messages'].last['content'])).to eq(
      'source' => { 'instructions' => 'Be kind' }, 'generated_draft' => { 'guardrails' => [] },
      'available_additions' => available.stringify_keys
    )
    expect(request['messages'].first['content']).to eq(Captain::PromptRenderer.render('instruction_auditor'))
  end

  it 'only offers sections with room, capped at each section’s limit' do
    auditor.perform

    expect(schema['properties'].keys).to contain_exactly('response_guidelines', 'needs_review', 'scenario_candidates',
                                                         'faq_document_candidates')
    expect(schema['properties'].transform_values { |property| property['maxItems'] })
      .to eq('response_guidelines' => 10, 'needs_review' => 3, 'scenario_candidates' => 5, 'faq_document_candidates' => 2)
    expect(schema.dig('properties', 'scenario_candidates', 'items', 'properties').keys)
      .to eq(%w[title description instruction response_guideline tool_ids])
  end

  it 'offers no FAQ or scenario sections when they are full' do
    available.merge!(scenario_candidates: 0, faq_document_candidates: 0)

    auditor.perform

    expect(schema['properties'].keys).to contain_exactly('response_guidelines', 'needs_review')
  end
end
