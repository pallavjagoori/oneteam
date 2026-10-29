require 'rails_helper'

# OneTeam coverage for disconnecting the Notion integration. Only admins may
# remove it; the account has at most one Notion hook.
RSpec.describe 'Notion integration API', type: :request do
  let(:account) { create(:account) }
  let(:url) { "/api/v1/accounts/#{account.id}/integrations/notion" }

  before { create(:integrations_hook, account: account, app_id: 'notion', access_token: 'secret') }

  it 'lets an admin disconnect Notion' do
    admin = create(:user, account: account, role: :administrator)

    delete url, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(account.hooks.where(app_id: 'notion')).to be_empty
  end

  it 'keeps the integration when an agent tries' do
    agent = create(:user, account: account, role: :agent)

    delete url, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unauthorized)
    expect(account.hooks.where(app_id: 'notion').count).to eq(1)
  end
end
