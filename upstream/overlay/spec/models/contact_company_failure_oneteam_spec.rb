# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a failing company lookup is logged instead of breaking the save.
RSpec.describe Contact do
  let(:account) { create(:account) }

  it 'logs when associating a company from the email fails' do
    account.enable_features!(:companies)
    service = instance_double(Contacts::CompanyAssociationService)
    allow(Contacts::CompanyAssociationService).to receive(:new).and_return(service)
    allow(service).to receive(:associate_company_from_email).and_raise(StandardError, 'lookup down')
    allow(Rails.logger).to receive(:error)

    contact = create(:contact, account: account, email: 'someone@example.com')

    expect(Rails.logger).to have_received(:error).with("Failed to associate company for contact #{contact.id}: lookup down")
  end
end
