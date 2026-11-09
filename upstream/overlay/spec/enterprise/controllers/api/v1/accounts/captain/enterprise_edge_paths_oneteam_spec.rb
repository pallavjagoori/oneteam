require 'rails_helper'

# OneTeam coverage for enterprise account API branches: bulk document
# actions with an unknown status, FAQ suggestion search, SAML settings that
# fail validation or have SSO switched off, and SAML login when it is off.
RSpec.describe 'Enterprise account API edge paths (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:headers) { admin.create_new_auth_token }
  let(:base) { "/api/v1/accounts/#{account.id}" }

  it 'does nothing for an unknown bulk document status' do
    document = create(:captain_document, account: account, assistant: create(:captain_assistant, account: account), status: :available)

    post "#{base}/captain/bulk_actions", params: { type: 'AssistantDocument', ids: [document.id], fields: { status: 'archive' } },
                                         headers: headers, as: :json

    expect(response).to have_http_status(:success)
    expect(document.reload).to be_present
  end

  it 'searches FAQ suggestions by question or answer' do
    assistant = create(:captain_assistant, account: account)
    get "#{base}/captain/faq_suggestions", params: { search: 'refund', assistant_id: assistant.id }, headers: headers

    expect(response).to have_http_status(:success)
  end

  describe 'SAML settings' do
    before do
      account.enable_features('saml')
      account.save!
    end

    it 'answers 422 when an update fails validation' do
      create(:account_saml_settings, account: account)

      put "#{base}/saml_settings", params: { saml_settings: { sso_url: '' } }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['errors']).to be_present
    end

    it 'answers 403 when SAML SSO is switched off for the installation' do
      allow(GlobalConfigService).to receive(:load).and_call_original
      allow(GlobalConfigService).to receive(:load).with('ENABLE_SAML_SSO_LOGIN', 'true').and_return('false')

      get "#{base}/saml_settings", headers: headers

      expect(response).to have_http_status(:forbidden)
    end

    it 'refuses SAML login when SAML SSO is switched off' do
      create(:account_saml_settings, account: account)
      allow(GlobalConfigService).to receive(:load).and_call_original
      allow(GlobalConfigService).to receive(:load).with('ENABLE_SAML_SSO_LOGIN', 'true').and_return('false')

      post '/api/v1/auth/saml_login', params: { email: admin.email }

      expect(response).to have_http_status(:forbidden)
    end
  end
end
