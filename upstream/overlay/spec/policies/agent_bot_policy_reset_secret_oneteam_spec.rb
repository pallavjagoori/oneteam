# frozen_string_literal: true

require 'rails_helper'

# OneTeam: only administrators may reset an agent bot secret.
RSpec.describe AgentBotPolicy do
  let(:account) { create(:account) }

  def policy_for(role)
    user = create(:user, account: account, role: role)
    described_class.new({ user: user, account: account, account_user: user.account_users.first }, create(:agent_bot))
  end

  it 'allows administrators and refuses agents' do
    expect(policy_for(:administrator).reset_secret?).to be(true)
    expect(policy_for(:agent).reset_secret?).to be(false)
  end
end
