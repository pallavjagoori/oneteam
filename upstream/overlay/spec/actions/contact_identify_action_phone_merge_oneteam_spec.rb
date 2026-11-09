require 'rails_helper'

RSpec.describe ContactIdentifyAction do
  it 'merges into the phone number contact when its email matches the request' do
    contact = create(:contact)
    phone_contact = create(:contact, account: contact.account, email: 'same@example.com', phone_number: '+14155552671')
    action = described_class.new(contact: contact, params: { email: 'same@example.com', phone_number: '+14155552671' })
    allow(action).to receive(:existing_phone_number_contact).and_return(phone_contact)

    expect(action.send(:mergable_phone_contact?)).to be(true)
  end
end
