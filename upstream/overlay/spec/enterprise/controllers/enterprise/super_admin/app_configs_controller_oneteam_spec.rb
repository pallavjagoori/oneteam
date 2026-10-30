require 'rails_helper'

# OneTeam coverage for the Enterprise super admin settings pages: custom
# branding and SAML show their own settings, and an unknown page falls back
# to Chatwoot's default list.
RSpec.describe 'Enterprise Super Admin settings pages', type: :request do
  let(:super_admin) { create(:super_admin) }

  before do
    allow(ChatwootHub).to receive(:pricing_plan).and_return('enterprise')
    sign_in(super_admin, scope: :super_admin)
  end

  {
    'custom_branding' => 'LOGO_THUMBNAIL',
    'saml' => 'ENABLE_SAML_SSO_LOGIN'
  }.each do |config, key|
    it "lists #{key} on the #{config} page" do
      post "/super_admin/app_config?config=#{config}", params: { app_config: { key => 'x' } }

      expect(response).to redirect_to(super_admin_app_config_path(config: config))
      expect(InstallationConfig.find_by(name: key)&.value).to eq('x')
    end
  end

  it 'falls back to the default settings for other pages' do
    get '/super_admin/app_config?config=email'

    expect(response).to have_http_status(:success)
  end
end
