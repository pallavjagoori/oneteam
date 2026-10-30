require 'rails_helper'

# OneTeam coverage for the job that expires a Copilot change nobody approved
# within five minutes, so the waiting turn can go on without it.
RSpec.describe Captain::Copilot::ApprovalExpiryJob do
  it 'expires a change still awaiting approval, and ignores a missing one' do
    account = create(:account)
    admin = create(:user, account: account, role: :administrator)
    account.enable_features!('copilot_workflows')
    create(:label, account: account, title: 'refund')
    action = copilot_label_action(start_copilot_turn(account: account, user: admin), [create(:conversation, account: account).id])

    described_class.perform_now(action.id)
    described_class.perform_now(0)

    expect(action.reload).to be_expired
  end
end
