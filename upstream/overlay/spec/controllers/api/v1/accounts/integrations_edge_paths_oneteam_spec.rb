require 'rails_helper'

# OneTeam coverage for integration endpoints' less common paths: switching
# the Slack message mode and a Linear disconnect whose token revocation
# fails.
RSpec.describe 'Integration edge paths (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:headers) { admin.create_new_auth_token }

  it 'switches the Slack message mode' do
    hook = create(:integrations_hook, account: account, app_id: 'slack', settings: { 'message_mode' => 'two_way' })

    put "/api/v1/accounts/#{account.id}/integrations/slack", params: { message_mode: 'alert' }, headers: headers, as: :json

    expect(response).to have_http_status(:success)
    expect(hook.reload.settings['message_mode']).to eq('alert')
  end

  it 'still disconnects Linear when revoking its token fails' do
    hook = create(:integrations_hook, account: account, app_id: 'linear', access_token: 'tok')
    linear = instance_double(Linear)
    allow(Linear).to receive(:new).and_return(linear)
    allow(linear).to receive(:revoke_token).and_raise(StandardError, 'linear down')
    allow(Rails.logger).to receive(:error)

    delete "/api/v1/accounts/#{account.id}/integrations/linear", headers: headers, as: :json

    expect(response).to have_http_status(:ok)
    expect(Integrations::Hook.exists?(hook.id)).to be(false)
    expect(Rails.logger).to have_received(:error).with('Failed to revoke Linear token: linear down')
  end
end
