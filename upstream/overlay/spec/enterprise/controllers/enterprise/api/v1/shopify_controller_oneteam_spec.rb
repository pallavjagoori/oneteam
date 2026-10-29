require 'rails_helper'

# OneTeam coverage for reconnecting a Shopify-billed account to its store.
# The admin returns from Shopify with a one-time pending install token; the
# controller claims it, installs, and gives the claim back on any failure so
# the token can be retried, except when the commit outcome is unknown.
RSpec.describe 'Shopify reconnect API', type: :request do
  let(:account) do
    create(:account, internal_attributes: { 'billing_provider' => 'shopify', 'signup_source' => 'shopify' })
  end
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:url) { "/enterprise/api/v1/accounts/#{account.id}/reconnect_shopify" }
  let(:pending_installation) { instance_double(Shopify::PendingInstallation, release!: true) }
  let(:installation) { instance_double(Shopify::InstallationService, perform: true) }

  before do
    allow(ChatwootApp).to receive(:chatwoot_cloud?).and_return(true)
    allow(Shopify::FeatureGate).to receive(:enabled?).and_return(true)
    allow(Shopify::PendingInstallation).to receive(:claim).with(token: 'install-token').and_return(pending_installation)
    allow(Shopify::InstallationService).to receive(:new)
      .with(account: account, pending_installation: pending_installation).and_return(installation)
  end

  def reconnect
    post url, params: { pending_install_token: 'install-token' }, headers: admin.create_new_auth_token, as: :json
  end

  it 'installs the claimed store' do
    reconnect

    expect(response).to have_http_status(:ok)
    expect(installation).to have_received(:perform)
    expect(pending_installation).not_to have_received(:release!)
  end

  it 'answers 409 and releases the claim when the store is already claimed' do
    allow(installation).to receive(:perform).and_raise(Shopify::PendingInstallation::AlreadyClaimed, 'Already claimed')

    reconnect

    expect(response).to have_http_status(:conflict)
    expect(response.parsed_body).to eq('error' => 'Already claimed')
    expect(pending_installation).to have_received(:release!)
  end

  it 'answers 422 for an invalid token' do
    allow(Shopify::PendingInstallation).to receive(:claim).and_raise(Shopify::PendingInstallation::InvalidToken, 'Invalid token')

    reconnect

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body).to eq('error' => 'Invalid token')
  end

  it 'keeps the claim when the commit outcome is unknown' do
    allow(installation).to receive(:perform).and_raise(Shopify::PendingInstallation::CommitOutcomeUnknown)

    reconnect

    expect(response).to have_http_status(:internal_server_error)
    expect(pending_installation).not_to have_received(:release!)
  end

  it 'releases the claim on an unexpected error' do
    allow(installation).to receive(:perform).and_raise(RuntimeError, 'boom')

    reconnect

    expect(response).to have_http_status(:internal_server_error)
    expect(pending_installation).to have_received(:release!)
  end

  it 'is not found for an account that did not sign up through Shopify' do
    other = create(:account, internal_attributes: { 'billing_provider' => 'shopify' })
    other_admin = create(:user, account: other, role: :administrator)

    post "/enterprise/api/v1/accounts/#{other.id}/reconnect_shopify", headers: other_admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:not_found)
  end

  it 'is not found for an account billed through Stripe' do
    other = create(:account, internal_attributes: { 'signup_source' => 'shopify' })
    other_admin = create(:user, account: other, role: :administrator)

    post "/enterprise/api/v1/accounts/#{other.id}/reconnect_shopify", headers: other_admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:not_found)
  end
end
