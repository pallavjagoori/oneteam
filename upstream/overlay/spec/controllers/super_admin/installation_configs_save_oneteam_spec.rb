require 'rails_helper'

# OneTeam coverage for saving installation settings in super admin: a new
# setting is created, and a setting that fails validation (switching off SAML
# login while SAML users exist) shows the form again.
RSpec.describe 'Super Admin installation config saving', type: :request do
  let(:super_admin) { create(:super_admin) }

  before { sign_in(super_admin, scope: :super_admin) }

  it 'creates a setting' do
    post '/super_admin/installation_configs', params: { installation_config: { name: 'ONETEAM_SETTING', value: 'on' } }

    expect(InstallationConfig.find_by(name: 'ONETEAM_SETTING').value).to eq('on')
    expect(response).to have_http_status(:redirect)
  end

  context 'when users sign in with SAML' do
    before { create(:user, provider: 'saml') }

    it 'refuses to create a setting that turns SAML login off' do
      post '/super_admin/installation_configs', params: { installation_config: { name: 'ENABLE_SAML_SSO_LOGIN', value: 'false' } }

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'refuses to update a setting to turn SAML login off' do
      config = create(:installation_config, name: 'ENABLE_SAML_SSO_LOGIN', value: true, locked: false)

      patch "/super_admin/installation_configs/#{config.id}", params: { installation_config: { name: config.name, value: 'false' } }

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
