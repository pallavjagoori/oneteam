require 'rails_helper'

RSpec.describe DataImportJob do
  it 'finds an imported contact by phone number when it has no identifier or email' do
    data_import = create(:data_import)
    contact = create(:contact, account: data_import.account, phone_number: '+14155552671', email: nil, identifier: nil)
    job = described_class.new
    job.instance_variable_set(:@data_import, data_import)

    found = job.send(:imported_contact, Contact.new(phone_number: '+14155552671'))

    expect(found).to eq(contact)
  end
end
