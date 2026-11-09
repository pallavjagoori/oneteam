require 'rails_helper'

RSpec.describe Enterprise::AutoAssignment::AssignmentService do
  let(:inbox) { create(:inbox) }
  let(:policy) do
    create(:assignment_policy, account: inbox.account, conversation_priority: :longest_waiting,
                               fair_distribution_limit: 5, fair_distribution_window: 600)
  end
  let(:service) { AutoAssignment::AssignmentService.new(inbox: inbox) }

  before { allow(service).to receive(:policy).and_return(policy) }

  it 'builds the assignment config from the policy' do
    expect(service.send(:assignment_config)).to include(
      'conversation_priority' => 'longest_waiting', 'fair_distribution_limit' => 5, 'fair_distribution_window' => 600
    )
  end

  it 'builds a balanced selector for the inbox' do
    expect(service.send(:balanced_selector)).to be_a(Enterprise::AutoAssignment::BalancedSelector)
  end

  it 'orders unassigned conversations by longest waiting first' do
    older = create(:conversation, inbox: inbox, account: inbox.account, assignee: nil, last_activity_at: 2.hours.ago)
    newer = create(:conversation, inbox: inbox, account: inbox.account, assignee: nil, last_activity_at: 1.hour.ago)
    older.update_column(:last_activity_at, 1.minute.ago) # rubocop:disable Rails/SkipsModelValidations

    expect(service.send(:unassigned_conversations, 10).to_a).to eq([newer, older])
  end
end
