require 'rails_helper'

# OneTeam coverage for voice-enabled Twilio inboxes in the list of inboxes a
# contact can be reached on.
RSpec.describe Enterprise::Contacts::ContactableInboxesService do
  let(:inbox) { instance_double(Inbox) }

  def service_for(contact)
    Contacts::ContactableInboxesService.new(contact: contact)
  end

  it 'offers the inbox with the contact phone number' do
    contact = build(:contact, phone_number: '+15550001111')

    expect(service_for(contact).send(:voice_contactable_inbox, inbox)).to eq(source_id: '+15550001111', inbox: inbox)
  end

  it 'skips contacts without a phone number' do
    expect(service_for(build(:contact, phone_number: nil)).send(:voice_contactable_inbox, inbox)).to be_nil
  end
end
