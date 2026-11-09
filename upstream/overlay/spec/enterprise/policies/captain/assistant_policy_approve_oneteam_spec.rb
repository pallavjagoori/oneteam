# frozen_string_literal: true

require 'rails_helper'

# OneTeam: approving and dismissing assistant suggestions follow update rights.
RSpec.describe Captain::AssistantPolicy do
  it 'lets administrators approve and dismiss, and refuses agents' do
    account = create(:account)
    admin = create(:user, account: account, role: :administrator)
    agent = create(:user, account: account, role: :agent)
    assistant = create(:captain_assistant, account: account)
    admin_policy = described_class.new({ user: admin, account: account, account_user: admin.account_users.first }, assistant)
    agent_policy = described_class.new({ user: agent, account: account, account_user: agent.account_users.first }, assistant)

    expect([admin_policy.approve?, admin_policy.dismiss?]).to eq([admin_policy.update?, admin_policy.update?])
    expect([agent_policy.approve?, agent_policy.dismiss?]).to eq([agent_policy.update?, agent_policy.update?])
  end
end
