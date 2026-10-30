require 'rails_helper'

# OneTeam coverage for a monitor automation that should no longer run once
# its conditions are checked: the conversation stopped matching, the rule
# was deleted meanwhile, or the delivery vanished. Action errors are
# reported, not raised.
RSpec.describe ConversationMonitors::ProcessAutomationDeliveryJob do
  let(:account) { create(:account).tap { |account| account.enable_features!('automations', 'reports', 'conversation_monitors') } }
  let(:monitor) { create(:conversation_monitor, account: account) }
  let(:conversation) { create(:conversation, account: account, status: :open) }
  let(:conditions) { [{ attribute_key: 'status', filter_operator: 'equal_to', values: ['open'], query_operator: nil }] }
  let(:rule) do
    create(:automation_rule, account: account, event_name: 'monitor_matched', monitor: monitor, conditions: conditions,
                             actions: [{ action_name: 'add_label', action_params: ['refund'] }])
  end
  let!(:delivery) do
    ConversationMonitors::AutomationDelivery.create!(account: account, monitor: monitor, automation_rule: rule, conversation: conversation)
  end

  it 'skips the action when the conversation no longer matches the rule' do
    conversation.update!(status: :resolved)

    described_class.perform_now(delivery.id)

    expect(delivery.reload).to have_attributes(status: 'skipped', skip_reason: 'conditions_changed')
  end

  it 'skips the action when the rule is deleted while its conditions are checked' do
    allow(AutomationRules::ConditionsFilterService).to receive(:new) do
      AutomationRule.where(id: rule.id).delete_all
      instance_double(AutomationRules::ConditionsFilterService, perform: [conversation])
    end

    described_class.perform_now(delivery.id)

    expect(delivery.reload).to have_attributes(status: 'skipped', skip_reason: 'monitor_or_rule_unavailable')
  end

  it 'gives up quietly when the delivery disappears' do
    allow_any_instance_of(ConversationMonitors::AutomationDelivery).to receive(:with_lock).and_raise(ActiveRecord::RecordNotFound) # rubocop:disable RSpec/AnyInstance
    allow(AutomationRules::ActionService).to receive(:new)

    described_class.perform_now(delivery.id)

    expect(AutomationRules::ActionService).not_to have_received(:new)
  end

  it 'gives up quietly when the delivery disappears after it was claimed' do
    allow(AutomationRules::ConditionsFilterService).to receive(:new) do
      ConversationMonitors::AutomationDelivery.where(id: delivery.id).delete_all
      instance_double(AutomationRules::ConditionsFilterService, perform: [conversation])
    end
    allow(AutomationRules::ActionService).to receive(:new)

    described_class.perform_now(delivery.id)

    expect(AutomationRules::ActionService).not_to have_received(:new)
  end

  it 'reports an action that fails' do
    allow(AutomationRules::ActionService).to receive(:new).and_raise(ArgumentError, 'bad action')
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)

    described_class.perform_now(delivery.id)

    expect(ChatwootExceptionTracker).to have_received(:new).with(an_instance_of(ArgumentError), account: account)
    expect(delivery.reload.status).to eq('executing')
  end
end
