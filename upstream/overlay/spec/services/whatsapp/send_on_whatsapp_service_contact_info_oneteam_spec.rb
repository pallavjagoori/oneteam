require 'rails_helper'

# OneTeam coverage for asking a WhatsApp contact for their details: sent as an
# interactive request inside the reply window, or tagged as a pending request
# when an agent sends the contact-info template.
describe Whatsapp::SendOnWhatsappService do
  let(:whatsapp_channel) { create(:channel_whatsapp, sync_templates: false, validate_provider_config: false) }
  let(:contact_inbox) { create(:contact_inbox, inbox: whatsapp_channel.inbox, source_id: '123456789') }
  let(:conversation) { create(:conversation, contact_inbox: contact_inbox, inbox: whatsapp_channel.inbox) }
  let(:eligibility) { instance_double(Whatsapp::ContactInfoRequestEligibilityService, ensure_available!: true) }

  before { allow(Whatsapp::ContactInfoRequestEligibilityService).to receive(:new).and_return(eligibility) }

  it 'sends an interactive contact info request' do
    message = create(:message, conversation: conversation, message_type: :outgoing,
                               content_attributes: { 'whatsapp_contact_info' => { 'type' => 'request' } })
    allow_any_instance_of(Channel::Whatsapp).to receive(:send_contact_info_request).and_return('wamid-1') # rubocop:disable RSpec/AnyInstance

    described_class.new(message: message).perform

    expect(message.reload.source_id).to eq('wamid-1')
    expect(eligibility).to have_received(:ensure_available!)
  end

  it 'tags the contact info template as a pending request' do
    template_params = { 'name' => 'contact_info', 'language' => 'en' }
    message = create(:message, conversation: conversation, message_type: :outgoing, additional_attributes: { 'template_params' => template_params })
    allow(eligibility).to receive(:request_contact_info_template?).and_return(true)
    processor = instance_double(Whatsapp::TemplateProcessorService, call: ['contact_info', nil, 'en', []])
    allow(Whatsapp::TemplateProcessorService).to receive(:new).and_return(processor)
    service = described_class.new(message: message)
    allow(service).to receive(:channel).and_return(instance_double(Channel::Whatsapp, send_template: 'wamid-2'))

    service.perform

    expect(message.reload.content_attributes['whatsapp_contact_info']).to include('state' => 'pending', 'delivery_mode' => 'template')
  end
end
