require 'rails_helper'

# OneTeam coverage for requesting WhatsApp embedded signup on Chatwoot Cloud.
# An admin states their use case; the feature is switched on and marked as
# manually managed, so plan changes do not switch it off again.
RSpec.describe 'WhatsApp access request API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:url) { "/api/v1/accounts/#{account.id}/whatsapp/access_request" }

  before { allow(ChatwootApp).to receive(:chatwoot_cloud?).and_return(true) }

  it 'enables embedded signup and records the use case' do
    account.update!(internal_attributes: { 'manually_managed_features' => ['captain_integration'] })

    post url, params: { use_case: '  Order updates  ' }, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['features']).to include('whatsapp_embedded_signup_inbox_creation')
    expect(account.reload).to be_feature_enabled('whatsapp_embedded_signup_inbox_creation')
    expect(account.internal_attributes).to include(
      'whatsapp_use_case' => 'Order updates',
      'manually_managed_features' => %w[captain_integration whatsapp_embedded_signup_inbox_creation]
    )
  end

  it 'requires a use case' do
    post url, params: { use_case: '   ' }, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(account.reload).not_to be_feature_enabled('whatsapp_embedded_signup_inbox_creation')
  end

  it 'is only available on Chatwoot Cloud' do
    allow(ChatwootApp).to receive(:chatwoot_cloud?).and_return(false)

    post url, params: { use_case: 'Support' }, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unauthorized)
  end

  it 'is admin only' do
    agent = create(:user, account: account, role: :agent)

    post url, params: { use_case: 'Support' }, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unauthorized)
  end
end
