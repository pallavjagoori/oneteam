require 'rails_helper'

RSpec.describe Whatsapp::ContactInfoResponseService do
  def identity_for(phone)
    service = described_class.new(contact_inbox: nil, message_payload: { contacts: [{ phones: [{ phone: phone }] }] })
    service.send(:shared_phone_identity)
  end

  it 'derives the identity from the shared phone number when no wa_id is present' do
    expect(identity_for('+1 415 555 2671')).to eq(phone_number: '+14155552671', source_id: '14155552671')
  end

  it 'returns nothing when the shared phone number is not valid' do
    expect(identity_for('not a number')).to be_nil
  end
end
