require 'rails_helper'

# OneTeam coverage for SAML sign-in failures (the identity provider's error
# goes back to the web login page or the mobile app), a SAML user that could
# not be saved, and a Google sign-up whose marketing attribution fails
# (the sign-up still succeeds).
RSpec.describe 'Enterprise OmniAuth failures', type: :request do
  let!(:account) { create(:account) }

  before do
    allow(ChatwootApp).to receive(:enterprise?).and_return(true)
    allow(GlobalConfigService).to receive(:load).and_call_original
    allow(GlobalConfigService).to receive(:load).with('FRONTEND_URL', 'http://localhost:3000').and_return('http://www.example.com')
  end

  describe 'SAML failure callback' do
    it 'sends the error back to the web login page' do
      get '/omniauth/failure', params: { strategy: 'saml', message: 'invalid_ticket', account_id: account.id, RelayState: '/app/inbox' }

      expect(response).to redirect_to(
        "http://www.example.com/app/login?error=saml-invalid_ticket&redirect_url=%2Fapp%2Finbox&sso_account_id=#{account.id}"
      )
    end

    it 'sends the error to the mobile app' do
      get '/omniauth/failure', params: { strategy: 'saml', RelayState: 'mobile' }

      expect(response).to redirect_to('chatwootapp://auth/saml?error=authentication-failed')
    end
  end

  it 'fails a SAML sign-in whose user could not be saved' do
    account.enable_features!('saml')
    create(:account_saml_settings, account: account)
    OmniAuth.config.test_mode = true
    OmniAuth.config.mock_auth[:saml] = OmniAuth::AuthHash.new(provider: 'saml', uid: '1', info: { email: 'new@example.com' })
    allow(SamlUserBuilder).to receive(:new).and_return(instance_double(SamlUserBuilder, perform: User.new))

    with_modified_env FRONTEND_URL: 'http://www.example.com' do
      get "/omniauth/saml/callback?account_id=#{account.id}"
    end

    expect(response).to redirect_to("http://www.example.com/app/login?error=saml-authentication-failed&sso_account_id=#{account.id}")
  end

  it 'still signs up a Google user when marketing attribution fails' do
    allow(ChatwootApp).to receive(:chatwoot_cloud?).and_return(true)
    allow(Account::SignUpEmailValidationService).to receive(:new).and_return(instance_double(Account::SignUpEmailValidationService, perform: true))
    allow(AccountBuilder).to receive(:new).and_return(instance_double(AccountBuilder, perform: [create(:user, account: account), account]))
    allow(Internal::Accounts::MarketingAttributionService).to receive(:new).and_raise(ArgumentError, 'bad cookie')
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
    OmniAuth.config.test_mode = true
    OmniAuth.config.mock_auth[:google_oauth2] = OmniAuth::AuthHash.new(provider: 'google', uid: '2', info: { name: 'G', email: 'g@example.com' })

    with_modified_env ENABLE_ACCOUNT_SIGNUP: 'true', FRONTEND_URL: 'http://www.example.com' do
      get '/omniauth/google_oauth2/callback'
      follow_redirect!
    end

    # A new Google user is sent to set a password.
    expect(response).to redirect_to(%r{/app/auth/password/edit\?.*reset_password_token=})
    expect(ChatwootExceptionTracker).to have_received(:new).with(an_instance_of(ArgumentError))
  end
end
