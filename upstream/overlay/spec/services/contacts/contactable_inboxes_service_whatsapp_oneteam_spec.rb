require 'rails_helper'

# OneTeam coverage for WhatsApp inboxes in the list of inboxes a contact can
# be reached on.
RSpec.describe Contacts::ContactableInboxesService do
  let(:inbox) { create(:channel_whatsapp, sync_templates: false, validate_provider_config: false).inbox }

  it 'uses the phone number without the plus sign' do
    service = described_class.new(contact: build(:contact, phone_number: '+15550001111'))

    expect(service.send(:get_contactable_inbox, inbox)).to eq(source_id: '15550001111', inbox: inbox)
  end

  it 'skips contacts without a phone number' do
    expect(described_class.new(contact: build(:contact, phone_number: nil)).send(:get_contactable_inbox, inbox)).to be_nil
  end
end
