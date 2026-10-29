require 'rails_helper'

# OneTeam coverage for asking a WhatsApp contact known only by a
# Business-Scoped User ID (no phone number) to share their phone number. The
# request goes out as an interactive message, so it needs an open 24-hour
# window and no other pending request.
RSpec.describe Whatsapp::ContactInfoRequestService do
  let(:channel) { create(:channel_whatsapp, provider: 'whatsapp_cloud', sync_templates: false, validate_provider_config: false) }
  let(:inbox) { channel.inbox }
  let(:agent) { create(:user, account: inbox.account) }
  let(:contact) { create(:contact, account: inbox.account, phone_number: nil) }
  let(:contact_inbox) { create(:contact_inbox, inbox: inbox, contact: contact, source_id: 'AE.2109889333218546') }
  let(:conversation) { create(:conversation, account: inbox.account, inbox: inbox, contact: contact, contact_inbox: contact_inbox) }
  let(:service) { described_class.new(conversation: conversation, sender: agent) }

  before { allow(channel).to receive(:send_contact_info_request) }

  it 'adds a pending interactive request from the agent' do
    create(:message, account: inbox.account, inbox: inbox, conversation: conversation, message_type: :incoming)

    message = service.perform

    expect(message).to have_attributes(content: 'Would you like to share your phone number with us?', sender: agent,
                                       message_type: 'outgoing')
    expect(message.content_attributes['whatsapp_contact_info'])
      .to eq('type' => 'request', 'state' => 'pending', 'delivery_mode' => 'interactive')
  end

  it 'refuses outside the messaging window' do
    expect { service.perform }.to raise_error(CustomExceptions::WhatsappContactInfoRequestError)
    expect(conversation.messages.outgoing).to be_empty
  end
end
