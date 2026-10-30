require 'rails_helper'

# OneTeam coverage for the default rules every policy inherits: everything is
# denied unless a policy allows it, except viewing a record the user's scope
# includes.
RSpec.describe ApplicationPolicy, type: :policy do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:inbox) { create(:inbox, account: account) }
  let(:context) { { user: admin, account: account, account_user: admin.account_users.first } }
  let(:policy) { described_class.new(context, inbox) }

  it 'denies every action by default' do
    expect([policy.index?, policy.create?, policy.new?, policy.update?, policy.edit?, policy.destroy?]).to all(be(false))
  end

  it 'allows viewing a record within the user scope' do
    Current.account = account
    expect(policy.show?).to be(true)
    expect(described_class.new(context, create(:inbox)).show?).to be(false)
  ensure
    Current.reset
  end
end
