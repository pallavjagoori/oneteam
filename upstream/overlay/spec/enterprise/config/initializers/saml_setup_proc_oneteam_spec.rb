require 'rails_helper'

# OneTeam coverage for the SAML setup proc when no account, or an account
# without SAML settings, is named: a dummy certificate keeps OmniAuth happy.
RSpec.describe 'SAML setup proc (OneTeam)', type: :request do
  def env_for(path)
    Rack::MockRequest.env_for(path).merge('omniauth.strategy' => Struct.new(:options).new({}))
  end

  it 'uses a dummy certificate without an account id' do
    env = env_for('/auth/saml')

    SAML_SETUP_PROC.call(env)

    expect(env['omniauth.strategy'].options[:idp_cert]).to eq('DUMMY')
  end

  it 'uses a dummy certificate when the account has no SAML settings' do
    env = env_for("/auth/saml?account_id=#{create(:account).id}")

    SAML_SETUP_PROC.call(env)

    expect(env['omniauth.strategy'].options[:idp_cert]).to eq('DUMMY')
    expect(env['omniauth.params']['account_id']).to be_present
  end
end
