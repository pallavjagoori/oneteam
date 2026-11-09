# frozen_string_literal: true

require 'rails_helper'

# OneTeam: every account member may list and create macros.
RSpec.describe MacroPolicy do
  it 'allows listing and creating macros' do
    account = create(:account)
    agent = create(:user, account: account, role: :agent)
    policy = described_class.new({ user: agent, account: account, account_user: agent.account_users.first }, Macro)

    expect([policy.index?, policy.create?]).to eq([true, true])
  end
end
