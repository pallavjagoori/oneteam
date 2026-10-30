require 'rails_helper'

# OneTeam coverage for an MFA login token whose user was deleted between the
# password step and the OTP step: the token must not resolve to anyone.
RSpec.describe Mfa::TokenService do
  before do
    skip('Needs Active Record encryption keys') unless Chatwoot.encryption_configured?
  end

  it 'returns nil when the user no longer exists' do
    user = create(:user)
    token = described_class.new(user: user).generate_token
    user.destroy!

    expect(described_class.new(token: token).verify_token).to be_nil
  end
end
