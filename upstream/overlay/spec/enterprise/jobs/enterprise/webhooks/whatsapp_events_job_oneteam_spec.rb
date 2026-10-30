require 'rails_helper'

# OneTeam coverage for WhatsApp calling webhooks: each call event and each
# call status goes to the incoming call service on its own, other statuses
# are skipped, and a contact's reply to a call permission request goes to
# its own service instead of the message pipeline.
RSpec.describe Webhooks::WhatsappEventsJob do
  let(:channel) { create(:channel_whatsapp, provider: 'whatsapp_cloud', sync_templates: false, validate_provider_config: false) }
  let(:call_service) { instance_double(Whatsapp::IncomingCallService, perform: true) }

  def payload(field, value)
    metadata = { phone_number_id: channel.provider_config['phone_number_id'], display_phone_number: channel.phone_number.delete('+') }
    { object: 'whatsapp_business_account', phone_number: channel.phone_number,
      entry: [{ changes: [{ field: field, value: value.merge(metadata: metadata) }] }] }
  end

  before { allow(Whatsapp::IncomingCallService).to receive(:new).and_return(call_service) }

  it 'handles each call event and call status separately, skipping message statuses' do
    contacts = [{ wa_id: '15550001111' }]
    described_class.perform_now(payload('calls', contacts: contacts,
                                                 calls: [{ id: 'wacid.1', event: 'connect' }, { id: 'wacid.2', event: 'terminate' }],
                                                 statuses: [{ id: 'wacid.1', type: 'call', status: 'RINGING' }, { id: 'wamid.9', type: 'message' }]))

    expect(Whatsapp::IncomingCallService).to have_received(:new)
      .with(inbox: channel.inbox, params: { calls: [{ id: 'wacid.1', event: 'connect' }], contacts: contacts })
    expect(Whatsapp::IncomingCallService).to have_received(:new)
      .with(inbox: channel.inbox, params: { calls: [{ id: 'wacid.2', event: 'terminate' }], contacts: contacts })
    expect(Whatsapp::IncomingCallService).to have_received(:new)
      .with(inbox: channel.inbox, params: { statuses: [{ id: 'wacid.1', type: 'call', status: 'RINGING' }] })
    expect(call_service).to have_received(:perform).exactly(3).times
  end

  it 'passes call permission replies to their own service' do
    reply_service = instance_double(Whatsapp::CallPermissionReplyService, perform: true)
    allow(Whatsapp::CallPermissionReplyService).to receive(:new).and_return(reply_service)
    params = payload('messages', contacts: [{ wa_id: '15550001111' }],
                                 messages: [{ from: '15550001111', id: 'wamid.1', type: 'interactive',
                                              interactive: { type: 'call_permission_reply', call_permission_reply: { response: 'accept' } } }])

    described_class.perform_now(params)

    expect(Whatsapp::CallPermissionReplyService).to have_received(:new).with(inbox: channel.inbox, params: params)
    expect(reply_service).to have_received(:perform)
  end
end
