require 'rails_helper'

# OneTeam coverage: Liquid templates can print a contact's phone number.
RSpec.describe ContactDrop do
  it 'exposes the phone number' do
    contact = build(:contact, phone_number: '+15550001111')

    expect(described_class.new(contact).phone_number).to eq('+15550001111')
  end
end
