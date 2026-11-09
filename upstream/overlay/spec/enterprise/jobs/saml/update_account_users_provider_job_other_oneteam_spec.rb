# frozen_string_literal: true

require 'rails_helper'

# OneTeam: for any other provider, every account user is updated.
RSpec.describe Saml::UpdateAccountUsersProviderJob do
  it 'selects all account users for another provider' do
    account = create(:account)
    user = create(:user, account: account)

    expect(described_class.new.send(:users_for_provider_update, account, 'google')).to contain_exactly(user)
  end
end
