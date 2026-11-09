require 'rails_helper'

# OneTeam coverage for falling back to a template when the 24 hour window is
# closed but an approved contact info template exists.
RSpec.describe Whatsapp::ContactInfoRequestEligibilityService do
  it 'offers template delivery outside the messaging window' do
    service = described_class.new(conversation: instance_double(Conversation))
    allow(service).to receive_messages(can_reply?: false, request_contact_info_templates: [{ 'name' => 'ask_phone' }])

    expect(service.send(:available_delivery_mode)).to eq('template')
  end
end
