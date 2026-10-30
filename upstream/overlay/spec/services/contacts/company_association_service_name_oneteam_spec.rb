require 'rails_helper'

# OneTeam coverage for linking a contact to a company from the legacy
# "company name" field (the dashboard bridge used until old company names
# are migrated), and for the race where two jobs create the same company.
RSpec.describe Contacts::CompanyAssociationService do
  let(:account) { create(:account) }
  let(:service) { described_class.new }

  before { account.enable_features!('companies') }

  it 'links the contact to an existing company with the same name, ignoring case' do
    company = create(:company, account: account, name: 'Acme')
    contact = create(:contact, account: account, additional_attributes: { 'company_name' => ' acme ' })

    service.associate_company_from_name(contact)

    expect(contact.company).to eq(company)
  end

  it 'skips blank or overlong names' do
    contact = create(:contact, account: account, additional_attributes: { 'company_name' => 'x' * (Limits::COMPANY_NAME_LENGTH_LIMIT + 1) })

    service.associate_company_from_name(contact)

    expect(contact.company).to be_nil
  end

  it 'uses the company another process created first' do
    company = create(:company, account: account, domain: 'acme.com')
    contact = build(:contact, account: account, email: 'ada@acme.com')
    allow(Company).to receive(:find_or_create_by!).and_raise(ActiveRecord::RecordNotUnique)

    expect(service.send(:find_or_create_company, contact)).to eq(company)
  end
end
