require 'rails_helper'

# OneTeam coverage for the `mfa:*` support tasks: turning off two-factor
# login for one user or everyone, and issuing new backup codes.
RSpec.describe 'mfa tasks' do # rubocop:disable RSpec/DescribeClass
  let(:user) { create(:user, email: 'ada@example.com') }

  def enable_mfa(user)
    Mfa::ManagementService.new(user: user).enable_two_factor!
    user.update!(otp_required_for_login: true)
  end

  describe 'mfa:reset' do
    it 'turns off two-factor login for the user' do
      enable_mfa(user)

      expect(run_rake('mfa:reset', user.email).output).to include('MFA has been successfully reset for ada@example.com')
      expect(user.reload.otp_required_for_login).to be(false)
      expect(user.otp_secret).to be_nil
    end

    it 'says when two-factor login is already off' do
      expect(run_rake('mfa:reset', user.email).output).to include('MFA is already disabled for ada@example.com')
    end

    it 'needs an email of an existing user' do
      expect(run_rake('mfa:reset').output).to include('Please provide an email address')
      expect(run_rake('mfa:reset', 'nobody@example.com').output).to include("User with email 'nobody@example.com' not found")
    end

    it 'reports errors while saving' do
      enable_mfa(user)
      allow(User).to receive(:from_email).and_return(user)
      allow(user).to receive(:update!).and_raise(StandardError, 'read only')

      expect(run_rake('mfa:reset', user.email).output).to include('Error resetting MFA: read only')
    end
  end

  describe 'mfa:reset_all' do
    it 'turns off two-factor login for everyone after confirmation' do
      enable_mfa(user)

      expect(run_rake('mfa:reset_all', input: "yes\n").output).to include('MFA has been reset for 1 user(s)')
      expect(user.reload.otp_required_for_login).to be(false)
    end

    it 'can be cancelled' do
      expect(run_rake('mfa:reset_all', input: "no\n").output).to include('Operation cancelled')
    end

    it 'says when nobody uses two-factor login' do
      expect(run_rake('mfa:reset_all', input: "yes\n").output).to include('No users have MFA enabled')
    end
  end

  describe 'mfa:generate_backup_codes' do
    it 'prints ten new backup codes' do
      enable_mfa(user)

      output = run_rake('mfa:generate_backup_codes', user.email).output

      expect(output).to include('New backup codes generated for ada@example.com')
      expect(output.scan(/^[0-9A-F]{8}$/).size).to eq(10)
    end

    it 'needs two-factor login to be on' do
      expect(run_rake('mfa:generate_backup_codes', user.email).output).to include('MFA is not enabled for ada@example.com')
    end
  end
end
