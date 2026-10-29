require 'rails_helper'

# OneTeam coverage for the super admin "manually managed features" field:
# features picked on the account form are stored in the account's internal
# attributes (so billing reconciliation leaves them alone), both when the
# account is created and when it is edited. Unknown names are dropped.
RSpec.describe 'Super Admin accounts manually managed features', type: :request do
  let(:super_admin) { create(:super_admin) }

  def managed_features(account)
    Internal::Accounts::InternalAttributesService.new(account.reload).manually_managed_features
  end

  before { sign_in(super_admin, scope: :super_admin) }

  it 'stores them when an account is created' do
    post '/super_admin/accounts', params: { account: { name: 'Acme', locale: 'en', manually_managed_features: %w[sla made_up] } }

    expect(managed_features(Account.find_by!(name: 'Acme'))).to eq(['sla'])
  end

  it 'stores them when an account is edited' do
    account = create(:account)

    patch "/super_admin/accounts/#{account.id}", params: { account: { name: 'Renamed', manually_managed_features: ['saml', ' '] } }

    expect(account.reload.name).to eq('Renamed')
    expect(managed_features(account)).to eq(['saml'])
  end
end
