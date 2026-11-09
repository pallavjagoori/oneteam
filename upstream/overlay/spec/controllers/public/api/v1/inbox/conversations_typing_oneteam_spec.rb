require 'rails_helper'

# OneTeam coverage for the public inbox conversations API: typing off, and
# finding a conversation through a verified (HMAC) contact.
RSpec.describe 'Public inbox conversations typing and HMAC lookup (OneTeam)', type: :request do
  let(:api_channel) { create(:channel_api) }
  let(:contact) { create(:contact, account: api_channel.account) }
  let(:contact_inbox) { create(:contact_inbox, contact: contact, inbox: api_channel.inbox) }
  let(:conversation) { create(:conversation, contact_inbox: contact_inbox, contact: contact, inbox: api_channel.inbox, account: api_channel.account) }
  let(:path) { "/public/api/v1/inboxes/#{api_channel.identifier}/contacts/#{contact_inbox.source_id}/conversations/#{conversation.display_id}" }

  before { allow(Rails.configuration.dispatcher).to receive(:dispatch) }

  it 'dispatches typing off' do
    post "#{path}/toggle_typing", params: { typing_status: 'off' }

    expect(response).to have_http_status(:success)
    expect(Rails.configuration.dispatcher).to have_received(:dispatch)
      .with(Conversation::CONVERSATION_TYPING_OFF, kind_of(Time), { conversation: conversation, user: contact })
  end

  it 'finds the conversation through the contact when the session is HMAC verified' do
    contact_inbox.update!(hmac_verified: true)

    get path

    expect(response).to have_http_status(:success)
    expect(response.parsed_body['id']).to eq(conversation.display_id)
  end
end
