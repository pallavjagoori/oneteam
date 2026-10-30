require 'rails_helper'

# OneTeam coverage for the account admin emails Chatwoot's spec leaves out:
# contact import finished (linking to the failed rows when there are any)
# or failed, contact export ready, and an automation rule switched off.
RSpec.describe AdministratorNotifications::AccountNotificationMailer do
  let(:account) { create(:account) }
  let!(:admin) { create(:user, account: account, role: :administrator) }
  let(:mailer) { described_class.with(account: account) }

  before { allow_any_instance_of(described_class).to receive(:smtp_config_set_or_development?).and_return(true) } # rubocop:disable RSpec/AnyInstance

  describe '#contact_import_complete' do
    let(:data_import) { create(:data_import, account: account, total_records: 5, processed_records: 3) }

    it 'links to the contacts page when every row was imported' do
      mail = mailer.contact_import_complete(data_import)

      expect(mail.subject).to eq('Contact Import Completed')
      expect(mail.to).to eq([admin.email])
      expect(mail.body.encoded).to include("/app/accounts/#{account.id}/contacts")
    end

    it 'links to the failed rows file when some rows failed' do
      data_import.failed_records.attach(io: StringIO.new('id,error'), filename: 'failed.csv', content_type: 'text/csv')

      expect(mailer.contact_import_complete(data_import).body.encoded).to include('failed.csv')
    end
  end

  it 'reports a failed contact import' do
    expect(mailer.contact_import_failed.subject).to eq('Contact Import Failed')
  end

  it 'sends the contact export link to the person who asked for it' do
    mail = mailer.contact_export_complete('https://files.example.com/contacts.csv', 'jane@example.com')

    expect(mail.to).to eq(['jane@example.com'])
    expect(mail.body.encoded).to include('https://files.example.com/contacts.csv')
  end

  it 'names the automation rule that was switched off' do
    rule = create(:automation_rule, account: account, name: 'Route VIPs')

    mail = mailer.automation_rule_disabled(rule)

    expect(mail.subject).to eq('Automation rule disabled due to validation errors.')
    expect(mail.body.encoded).to include('Route VIPs')
  end
end
