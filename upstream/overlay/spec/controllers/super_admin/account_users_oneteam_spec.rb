require 'rails_helper'

# OneTeam coverage for adding and removing a user's account memberships
# from super admin: the membership page sends you to the user, adding
# reports success or the first error, and removing reports either way.
RSpec.describe 'Super Admin account users', type: :request do
  let(:super_admin) { create(:super_admin) }
  let(:account) { create(:account) }
  let(:user) { create(:user) }

  before { sign_in(super_admin, scope: :super_admin) }

  it 'shows a membership as its user' do
    account_user = create(:account_user, account: account, user: user)

    get "/super_admin/account_users/#{account_user.id}"

    expect(response).to redirect_to("/super_admin/users/#{user.id}")
  end

  it 'adds a user to an account, or reports why not' do
    post '/super_admin/account_users', params: { account_user: { account_id: account.id, user_id: user.id, role: 'agent' } }
    expect(account.users).to include(user)
    expect(flash[:notice]).to be_present

    post '/super_admin/account_users', params: { account_user: { account_id: account.id, user_id: user.id, role: 'agent' } }
    expect(flash[:notice]).to match(/already/i)
  end

  it 'removes a membership, or reports why it could not' do
    account_user = create(:account_user, account: account, user: user)
    delete "/super_admin/account_users/#{account_user.id}"
    expect(AccountUser.exists?(account_user.id)).to be(false)
    expect(flash[:notice]).to be_present

    other = create(:account_user, account: account)
    allow_any_instance_of(AccountUser).to receive(:destroy) do |record| # rubocop:disable RSpec/AnyInstance
      record.errors.add(:base, 'Last admin')
      false
    end
    delete "/super_admin/account_users/#{other.id}"
    expect(flash[:error]).to eq('Last admin')
  end
end
