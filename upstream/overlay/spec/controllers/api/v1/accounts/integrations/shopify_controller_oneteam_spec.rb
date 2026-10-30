require 'rails_helper'

# OneTeam coverage for the Shopify integration endpoints Chatwoot's spec
# leaves out: starting the OAuth install (shop domain check, missing app
# credentials, the Shopify authorize link), Shopify API errors while
# listing orders, install failures that must keep or release the claim,
# and a failed disconnect. Request specs turn a raised error into a 500,
# so the cases that re-raise expect that status.
RSpec.describe 'Shopify integration API (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:client_id) { 'shopify-app' }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:headers) { admin.create_new_auth_token }
  let(:base) { "/api/v1/accounts/#{account.id}/integrations/shopify" }

  before do
    account.enable_features!('shopify_integration')
    InstallationConfig.where(name: 'ENABLE_SHOPIFY_INTEGRATION').first_or_initialize.update!(value: true)
    allow(Shopify::ApiContext).to receive(:setup!)
    allow(GlobalConfigService).to receive(:load).and_call_original
    allow(GlobalConfigService).to receive(:load).with('SHOPIFY_CLIENT_ID', nil).and_return(client_id)
    allow(GlobalConfigService).to receive(:load).with('SHOPIFY_CLIENT_SECRET', nil).and_return('secret')
  end

  describe 'starting the install' do
    it 'returns the Shopify authorize link for a valid shop' do
      post "#{base}/auth", params: { shop_domain: 'my-store.myshopify.com' }, headers: headers, as: :json

      url = URI.parse(response.parsed_body['redirect_url'])
      expect(url.host).to eq('my-store.myshopify.com')
      expect(url.path).to eq('/admin/oauth/authorize')
      expect(Rack::Utils.parse_query(url.query)).to include('client_id' => 'shopify-app', 'scope' => 'read_customers,read_orders,read_fulfillments')
    end

    it 'rejects a shop domain that is not a Shopify store' do
      post "#{base}/auth", params: { shop_domain: 'evil.example.com' }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body['error']).to eq('Invalid Shopify shop domain')
    end

    context 'when the Shopify app is not configured' do
      let(:client_id) { nil }

      it 'fails' do
        post "#{base}/auth", params: { shop_domain: 'my-store.myshopify.com' }, headers: headers, as: :json

        expect(response).to have_http_status(:internal_server_error)
      end
    end
  end

  describe 'listing orders' do
    let!(:hook) { create(:integrations_hook, :shopify, account: account) }
    let(:contact) { create(:contact, account: account, email: 'jane@example.com') }
    let(:client) { instance_double(ShopifyAPI::Clients::Rest::Admin) }

    it 'connects with the store token and returns Shopify errors as a 422' do
      shopify_response = ShopifyAPI::Clients::HttpResponse.new(code: 429, headers: {}, body: { 'errors' => 'Throttled' })
      expect(ShopifyAPI::Clients::Rest::Admin).to receive(:new) do |session:, api_version:|
        expect([session.shop, session.access_token, api_version]).to eq([hook.reference_id, hook.access_token, Shopify::ApiContext::API_VERSION])
        client
      end
      allow(client).to receive(:get).and_raise(ShopifyAPI::Errors::HttpResponseError.new(response: shopify_response))

      get "#{base}/orders", params: { contact_id: contact.id }, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body['error']).to be_present
    end
  end

  describe 'completing the install' do
    let(:pending) { instance_double(Shopify::PendingInstallation, release!: true) }
    let(:installer) { instance_double(Shopify::InstallationService) }

    before do
      allow(Shopify::PendingInstallation).to receive(:claim).with(token: 'tok').and_return(pending)
      allow(Shopify::InstallationService).to receive(:new).and_return(installer)
    end

    def complete
      post "#{base}/complete_install", params: { pending_install_token: 'tok' }, headers: headers, as: :json
    end

    it 'keeps the claim when the outcome of saving is unknown' do
      allow(installer).to receive(:perform).and_raise(Shopify::PendingInstallation::CommitOutcomeUnknown)

      complete

      expect(response).to have_http_status(:internal_server_error)
      expect(pending).not_to have_received(:release!)
    end

    it 'releases the claim on an unexpected error' do
      allow(installer).to receive(:perform).and_raise(StandardError, 'boom')

      complete

      expect(response).to have_http_status(:internal_server_error)
      expect(pending).to have_received(:release!)
    end
  end

  it 'returns an error when the integration cannot be removed' do
    create(:integrations_hook, :shopify, account: account)
    allow_any_instance_of(Integrations::Hook).to receive(:destroy!).and_raise(StandardError, 'locked') # rubocop:disable RSpec/AnyInstance

    delete base, headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['error']).to eq('locked')
  end
end
