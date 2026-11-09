require 'rails_helper'

# OneTeam coverage for WhatsApp identity rotation when identifiers belong to
# several contacts, or another process records the alias first.
RSpec.describe Whatsapp::UserIdRotationService do
  let(:inbox) { create(:channel_whatsapp, sync_templates: false, validate_provider_config: false).inbox }
  let(:service) { described_class.new(inbox: inbox, messages: []) }

  before { allow(Rails.logger).to receive(:warn) }

  it 'gives up when the identifiers belong to more than one contact' do
    create(:contact_inbox, inbox: inbox, source_id: '15550000001')
    create(:contact_inbox, inbox: inbox, source_id: '15550000002')

    expect(service.send(:single_contact_for, %w[15550000001 15550000002], 'previous')).to be_nil
    expect(Rails.logger).to have_received(:warn).with(/previous identifiers belong to multiple contacts/)
  end

  it 'logs an alias recorded by another contact in the meantime' do
    contact = create(:contact, account: inbox.account)
    other = create(:contact_inbox, inbox: inbox, source_id: '15550000003')
    relation = inbox.contact_inboxes
    allow(inbox).to receive(:contact_inboxes).and_return(relation)
    allow(relation).to receive(:find_by).and_call_original
    allow(relation).to receive(:find_by).with(source_id: '15550000003').and_return(nil, other)
    allow(relation).to receive(:create!).and_raise(ActiveRecord::RecordNotUnique)

    service.send(:record_aliases, contact, ['15550000003'])

    expect(Rails.logger).to have_received(:warn).with(/15550000003 already belongs to contact #{other.contact_id}/)
  end
end
