require 'rails_helper'

RSpec.describe Migration::BackfillCompaniesContactsCountJob do
  it 'runs on the async database migration queue' do
    expect(described_class.new.queue_name).to eq('async_database_migration')
  end

  it 'resets the contacts counter of every company' do
    account = create(:account)
    company = create(:company, account: account)
    create(:contact, account: account, company: company)
    company.update_column(:contacts_count, 0) # rubocop:disable Rails/SkipsModelValidations

    described_class.perform_now

    expect(company.reload.contacts_count).to eq(1)
  end
end
