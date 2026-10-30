require 'rails_helper'

# OneTeam coverage for starting an outbound voice call to a contact from a
# Twilio voice inbox. The call itself is placed by Voice::OutboundCallBuilder,
# which has its own spec; this pins the endpoint's checks and which existing
# conversation, if any, the call joins.
RSpec.describe 'Contact calls API', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:channel) { create(:channel_twilio_sms, :with_voice, account: account) }
  let(:inbox) { channel.inbox }
  let(:contact) { create(:contact, account: account, phone_number: '+15550001111') }
  let(:url) { "/api/v1/accounts/#{account.id}/contacts/#{contact.id}/call" }
  let(:placed_call) do
    instance_double(Call, conversation: build_stubbed(:conversation, display_id: 42), provider_call_id: 'CA123',
                          conference_sid: 'conf_1')
  end

  before do
    allow(Twilio::VoiceWebhookSetupService).to receive(:new)
      .and_return(instance_double(Twilio::VoiceWebhookSetupService, perform: 'AP1'))
    create(:inbox_member, inbox: inbox, user: agent)
    allow(Voice::OutboundCallBuilder).to receive(:perform!).and_return(placed_call)
  end

  def call_contact(**params)
    post url, params: { inbox_id: inbox.id }.merge(params), headers: agent.create_new_auth_token, as: :json
  end

  def joined_conversation
    conversation = nil
    expect(Voice::OutboundCallBuilder).to have_received(:perform!) { |args| conversation = args[:conversation] }
    conversation
  end

  it 'places the call and returns its ids' do
    call_contact

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq('conversation_id' => 42, 'inbox_id' => inbox.id, 'call_sid' => 'CA123',
                                       'conference_sid' => 'conf_1')
    expect(Voice::OutboundCallBuilder).to have_received(:perform!)
      .with(account: account, inbox: inbox, user: agent, contact: contact, conversation: nil)
  end

  it 'joins the open conversation the agent is in' do
    conversation = create(:conversation, account: account, inbox: inbox, contact: contact)

    call_contact(conversation_id: conversation.display_id)

    expect(joined_conversation).to eq(conversation)
  end

  {
    'is not open' => ->(c) { c.update!(status: :resolved) },
    'is with another contact' => ->(c) { c.update!(contact: create(:contact, account: c.account)) }
  }.each do |reason, change|
    it "starts a new conversation when the hinted one #{reason}" do
      conversation = create(:conversation, account: account, inbox: inbox, contact: contact)
      instance_exec(conversation, &change)

      call_contact(conversation_id: conversation.display_id)

      expect(joined_conversation).to be_nil
    end
  end

  it 'ignores a hint that matches no conversation' do
    call_contact(conversation_id: 999_999)

    expect(joined_conversation).to be_nil
  end

  it 'ignores a conversation in another inbox' do
    conversation = create(:conversation, account: account, contact: contact)

    call_contact(conversation_id: conversation.display_id)

    expect(joined_conversation).to be_nil
  end

  it 'needs the contact to have a phone number' do
    contact.update!(phone_number: nil)

    call_contact

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq('Contact phone number is required')
  end

  it 'returns 404 when the inbox has voice turned off' do
    allow(Twilio::VoiceTeardownService).to receive(:new).and_return(instance_double(Twilio::VoiceTeardownService, perform: true))
    channel.update!(voice_enabled: false)

    call_contact

    expect(response).to have_http_status(:not_found)
  end

  it 'returns 404 for an inbox the agent is not a member of' do
    other = create(:channel_twilio_sms, :with_voice, account: account).inbox

    call_contact(inbox_id: other.id)

    expect(response).to have_http_status(:not_found)
    expect(Voice::OutboundCallBuilder).not_to have_received(:perform!)
  end
end
