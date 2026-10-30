require 'rails_helper'

# OneTeam coverage for the notice the instance admin gets when an account is
# deleted: who was removed, why and when, or nothing when no admin email is
# configured.
RSpec.describe AdministratorNotifications::AccountComplianceMailer do
  let(:account) do
    create(:account, name: 'Acme', custom_attributes: { 'marked_for_deletion_reason' => 'inactivity',
                                                        'marked_for_deletion_at' => '2026-01-02T03:04:05Z' })
  end
  let(:users) { [{ id: 7, original_email: 'ada@example.com' }] }

  def deliver
    described_class.with(account: account, soft_deleted_users: users).account_deleted(account).deliver_now
  end

  it 'emails the instance admin about the deletion' do
    create(:installation_config, name: 'CHATWOOT_INSTANCE_ADMIN_EMAIL', value: 'admin@example.com')
    GlobalConfig.clear_cache

    mail = with_modified_env(SMTP_ADDRESS: 'smtp.example.com') { deliver }

    expect(mail.to).to eq(['admin@example.com'])
    expect(mail.subject).to eq("Account Deletion Notice for #{account.id} - Acme")
  ensure
    GlobalConfig.clear_cache
  end

  it 'sends nothing without an instance admin email' do
    GlobalConfig.clear_cache

    expect(deliver).to be_nil.or(have_attributes(to: nil))
  end
end
