# frozen_string_literal: true

require 'rails_helper'

# OneTeam: only administrators see inbox health and reset inbox secrets.
RSpec.describe InboxPolicy do
  let(:account) { create(:account) }

  def policy_for(role)
    user = create(:user, account: account, role: role)
    described_class.new({ user: user, account: account, account_user: user.account_users.first }, create(:inbox, account: account))
  end

  it 'allows administrators and refuses agents' do
    expect([policy_for(:administrator).health?, policy_for(:administrator).reset_secret?]).to eq([true, true])
    expect([policy_for(:agent).health?, policy_for(:agent).reset_secret?]).to eq([false, false])
  end
end
