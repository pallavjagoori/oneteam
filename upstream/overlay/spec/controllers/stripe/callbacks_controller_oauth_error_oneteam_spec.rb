require 'rails_helper'

# OneTeam coverage for Stripe OAuth token exchange errors: the error code is
# only logged when it is a known OAuth code.
RSpec.describe Stripe::CallbacksController do
  let(:controller_instance) { described_class.new }

  it 'reports token exchange failures with a known error code' do
    faraday = Faraday::Response.new(status: 400, body: '{"error":"invalid_grant"}', response_headers: { 'Content-Type' => 'application/json' })
    error = OAuth2::Error.new(OAuth2::Response.new(faraday))
    auth_code = instance_double(OAuth2::Strategy::AuthCode)
    allow(auth_code).to receive(:get_token).and_raise(error)
    allow(Integrations::Stripe::Oauth).to receive_messages(client: instance_double(OAuth2::Client, auth_code: auth_code),
                                                           callback_url: 'https://app.example/stripe/callback')
    allow(controller_instance).to receive(:params).and_return(ActionController::Parameters.new(code: 'ac_1'))
    allow(controller_instance).to receive(:authorization_failed)

    controller_instance.show

    expect(controller_instance).to have_received(:authorization_failed)
      .with('token_exchange_failed', oauth_error: 'invalid_grant', http_status: 400)
  end

  it 'hides unknown error codes' do
    expect(controller_instance.send(:safe_oauth_error_code, 'secret sk_live_123')).to eq('unknown')
  end
end
