# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a user's inviter comes from their membership in the current account.
RSpec.describe User do
  it 'returns the inviter of the current account membership' do
    account = create(:account)
    inviter = create(:user, account: account)
    user = create(:user)
    create(:account_user, account: account, user: user, inviter: inviter)
    Current.account = account

    expect(user.inviter).to eq(inviter)
  ensure
    Current.reset
  end
end
