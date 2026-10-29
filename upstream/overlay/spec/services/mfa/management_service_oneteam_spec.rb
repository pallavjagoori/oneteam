require 'rails_helper'

# OneTeam coverage for the MFA state checks on Mfa::ManagementService. A user
# has MFA on only once login requires an OTP; a stored secret without that is
# an enrolment the user started but has not confirmed.
RSpec.describe Mfa::ManagementService do
  subject(:service) { described_class.new(user: user) }

  let(:user) { create(:user) }

  before do
    skip('Needs Active Record encryption keys') unless Chatwoot.encryption_configured?
  end

  it 'has MFA off and no pending setup for a new user' do
    expect(service).not_to be_mfa_enabled
    expect(service).not_to be_two_factor_setup_pending
  end

  it 'has a pending setup once a secret exists but is not confirmed' do
    user.update!(otp_secret: User.generate_otp_secret)

    expect(service).not_to be_mfa_enabled
    expect(service).to be_two_factor_setup_pending
  end

  it 'has MFA on once login requires an OTP' do
    user.update!(otp_secret: User.generate_otp_secret, otp_required_for_login: true)

    expect(service).to be_mfa_enabled
    expect(service).not_to be_two_factor_setup_pending
  end
end
