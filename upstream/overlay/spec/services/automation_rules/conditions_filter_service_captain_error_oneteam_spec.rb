require 'rails_helper'

# OneTeam coverage for automation rules whose Captain condition check fails:
# the rule does not match.
RSpec.describe AutomationRules::ConditionsFilterService do
  it 'does not match when the Captain check raises' do
    conversation = create(:conversation)
    rule = instance_double(AutomationRule, id: 1, conditions: [])
    service = described_class.new(rule, conversation)
    allow(service).to receive_messages(rule_valid?: true, captain_indexes: [0])
    allow(service).to receive(:matches?) { |answers| answers[0] }
    allow(Captain::AutomationConditionService).to receive(:new).and_raise(StandardError, 'llm down')
    allow(Rails.logger).to receive(:error)

    expect(service.perform).to be(false)
    expect(Rails.logger).to have_received(:error).with('Error in AutomationRules::ConditionsFilterService: llm down')
  end
end
