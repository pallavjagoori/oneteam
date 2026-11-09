require 'rails_helper'

RSpec.describe 'Stripe customer lookup errors', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let!(:hook) { create(:integrations_hook, app_id: 'stripe', account: account, reference_id: 'acct_1', access_token: 'secret') }
  let(:path) { "/api/v1/accounts/#{account.id}/integrations/stripe/customer" }
  let(:conversation) { create(:conversation, account: account) }
  let(:summary) { instance_double(Integrations::Stripe::CustomerSummary) }

  before do
    account.enable_features!('stripe_integration')
    allow(Integrations::Stripe::Oauth).to receive(:configured?).and_return(true)
    allow(Integrations::Stripe::CustomerSummary).to receive(:new).and_return(summary)
  end

  it 'rejects a conversation id that is not a positive integer' do
    get path, params: { conversation_id: 'abc' }, headers: admin.create_new_auth_token

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.body).to include('conversation_id must be a positive integer')
  end

  it 'asks for reauthorization when Stripe rejects the credentials' do
    allow(summary).to receive(:perform).and_raise(Stripe::AuthenticationError, 'bad key')

    get path, params: { conversation_id: conversation.display_id }, headers: admin.create_new_auth_token

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body).to eq('error' => 'stripe_reauthorization_required')
    expect(hook.reload.reauthorization_required?).to be(true)
  end

  it 'reports Stripe as unavailable and asks for reauthorization on an invalid grant' do
    faraday = Faraday::Response.new(status: 400, body: '{"error":"invalid_grant"}', response_headers: { 'Content-Type' => 'application/json' })
    allow(summary).to receive(:perform).and_raise(OAuth2::Error.new(OAuth2::Response.new(faraday)))

    get path, params: { conversation_id: conversation.display_id }, headers: admin.create_new_auth_token

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body).to eq('error' => 'stripe_unavailable')
    expect(hook.reload.reauthorization_required?).to be(true)
  end
end
