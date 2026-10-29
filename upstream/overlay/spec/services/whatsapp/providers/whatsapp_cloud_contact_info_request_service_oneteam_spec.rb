require 'rails_helper'

# OneTeam coverage for the WhatsApp Cloud API call that sends a
# request_contact_info interactive message. Phone numbers go in `to`; a
# Business-Scoped User ID must go in `recipient` (see BaseService).
RSpec.describe Whatsapp::Providers::WhatsappCloudContactInfoRequestService do
  let(:channel) do
    create(:channel_whatsapp, provider: 'whatsapp_cloud', sync_templates: false, validate_provider_config: false).tap do |channel|
      channel.update_columns(provider_config: { 'api_key' => 'token', 'phone_number_id' => '123' }) # rubocop:disable Rails/SkipsModelValidations
    end
  end
  let(:conversation) { create(:conversation, inbox: channel.inbox, account: channel.account) }
  let(:message) do
    create(:message, conversation: conversation, inbox: channel.inbox, account: channel.account, content: 'Share your number?',
                     message_type: :outgoing)
  end
  let(:url) { 'https://graph.facebook.com/v22.0/123/messages' }

  # reply(messages: [...]) or reply({ error: ... }, status: 400)
  def reply(body = nil, status: 200, **fields)
    stub_request(:post, url).to_return(status: status, body: (body || fields).to_json, headers: { 'Content-Type' => 'application/json' })
  end

  it 'sends the request to a Business-Scoped User ID and returns the message id' do
    reply(messages: [{ id: 'wamid.1' }])

    expect(described_class.perform(channel, 'AE.2109889333218546', message)).to eq('wamid.1')
    expect(a_request(:post, url).with(
             headers: { 'Authorization' => 'Bearer token', 'Content-Type' => 'application/json' },
             body: {
               messaging_product: 'whatsapp', recipient_type: 'individual', recipient: 'AE.2109889333218546',
               type: 'interactive',
               interactive: { type: 'request_contact_info', body: { text: 'Share your number?' },
                              action: { name: 'request_contact_info' } }
             }.to_json
           )).to have_been_made
  end

  it 'addresses a phone number with `to`' do
    reply(messages: [{ id: 'wamid.2' }])

    described_class.perform(channel, '15550001111', message)

    expect(a_request(:post, url).with { |request| JSON.parse(request.body)['to'] == '15550001111' }).to have_been_made
  end

  it 'uses the configured API version and base URL' do
    allow(GlobalConfigService).to receive(:load).and_call_original
    allow(GlobalConfigService).to receive(:load).with('WHATSAPP_API_VERSION', 'v22.0').and_return('v23.0')
    stub_request(:post, 'https://graph.example/v23.0/123/messages').to_return(status: 200, body: { messages: [{ id: 'w' }] }.to_json,
                                                                              headers: { 'Content-Type' => 'application/json' })

    with_modified_env WHATSAPP_CLOUD_BASE_URL: 'https://graph.example' do
      expect(described_class.perform(channel, '15550001111', message)).to eq('w')
    end
  end

  it 'marks the message failed with WhatsApp’s error' do
    reply({ error: { message: 'Recipient not available' } }, status: 400)

    expect(described_class.perform(channel, '15550001111', message)).to be_nil
    expect(message.reload).to have_attributes(status: 'failed', external_error: 'Recipient not available')
  end

  it 'leaves the message alone when the error has no readable message' do
    stub_request(:post, url).to_return(status: 500, body: 'oops')

    expect(described_class.perform(channel, '15550001111', message)).to be_nil
    expect(message.reload.status).not_to eq('failed')
  end
end
