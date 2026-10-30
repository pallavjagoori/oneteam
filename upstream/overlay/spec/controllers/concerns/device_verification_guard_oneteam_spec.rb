require 'rails_helper'

# OneTeam coverage for the community default of DeviceVerificationGuard. The
# enterprise edition overrides #device_verification_intercepted? on the
# sessions controller to challenge logins from unknown devices; without it, no
# login is held back for device verification.
RSpec.describe DeviceVerificationGuard do
  it 'does not intercept logins by default' do
    guard = Class.new { include DeviceVerificationGuard }.new

    expect(guard.send(:device_verification_intercepted?, build(:user))).to be(false)
  end
end
