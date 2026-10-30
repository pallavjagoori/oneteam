require 'rails_helper'

# OneTeam coverage for sending a WhatsApp template through Twilio: the
# message's template parameters are turned into a Twilio content id and
# variables, a missing template marks the message failed, and a sent
# template stores Twilio's message id on the message.
describe Twilio::SendOnTwilioService do
  let(:channel) { create(:channel_twilio_sms, medium: :whatsapp, messaging_service_sid: nil, phone_number: '+15550001111') }
  let(:inbox) { channel.inbox }
  let(:contact_inbox) { create(:contact_inbox, inbox: inbox, source_id: 'whatsapp:+15552223333') }
  let(:conversation) { create(:conversation, inbox: inbox, contact_inbox: contact_inbox, contact: contact_inbox.contact) }
  let(:message) do
    create(:message, message_type: :outgoing, conversation: conversation, inbox: inbox, account: inbox.account,
                     additional_attributes: { template_params: { name: 'order_update' } })
  end
  let(:twilio_messages) { double }

  before do
    allow(Twilio::REST::Client).to receive(:new).and_return(instance_double(Twilio::REST::Client, messages: twilio_messages))
  end

  def processed_as(*result)
    allow(Twilio::TemplateProcessorService).to receive(:new).and_return(instance_double(Twilio::TemplateProcessorService, call: result))
  end

  it 'sends the template with its variables' do
    processed_as('HX1', { '1' => 'Jane' })
    expect(twilio_messages).to receive(:create)
      .with(hash_including(to: 'whatsapp:+15552223333', content_sid: 'HX1', content_variables: '{"1":"Jane"}', from: '+15550001111'))
      .and_return(instance_double(Twilio::REST::Api::V2010::AccountContext::MessageInstance, sid: 'SM1'))

    described_class.new(message: message).perform

    expect(message.reload.source_id).to eq('SM1')
  end

  it 'marks the message failed when no template matches' do
    processed_as(nil, nil)
    expect(twilio_messages).not_to receive(:create)

    described_class.new(message: message).perform

    expect(message.reload).to have_attributes(status: 'failed', external_error: 'Template not found')
  end
end
