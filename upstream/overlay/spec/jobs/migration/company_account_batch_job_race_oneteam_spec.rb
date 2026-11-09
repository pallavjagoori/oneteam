# frozen_string_literal: true

require 'rails_helper'

# OneTeam: when another job creates the company first, the existing one is used.
RSpec.describe Migration::CompanyAccountBatchJob do
  it 'falls back to the company created by a concurrent job' do
    account = create(:account)
    company = create(:company, account: account, domain: 'acme.com')
    contact = create(:contact, account: account, email: 'jane@acme.com')
    allow(Company).to receive(:find_or_create_by!).and_raise(ActiveRecord::RecordNotUnique)

    expect(described_class.new.send(:find_or_create_company, contact, account)).to eq(company)
  end
end
