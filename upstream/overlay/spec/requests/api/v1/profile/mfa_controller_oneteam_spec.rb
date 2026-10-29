require 'rails_helper'

# OneTeam coverage for the MFA settings API when the installation has no
# Active Record encryption keys: MFA cannot work then, so every endpoint says
# the feature is unavailable rather than storing an unencrypted OTP secret.
RSpec.describe 'MFA API without encryption keys', type: :request do
  let(:user) { create(:user, account: create(:account)) }

  it 'reports the feature as unavailable' do
    allow(Chatwoot).to receive(:mfa_enabled?).and_return(false)

    post '/api/v1/profile/mfa', headers: user.create_new_auth_token, as: :json

    expect(response).to have_http_status(:forbidden)
    expect(response.parsed_body['error']).to eq(I18n.t('errors.mfa.feature_unavailable'))
    expect(user.reload.otp_secret).to be_nil
  end
end
