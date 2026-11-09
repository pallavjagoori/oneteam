require 'rails_helper'

# OneTeam coverage for widget sessions verified with HMAC: they see the
# contact's conversations from every verified session of the inbox.
RSpec.describe '/api/v1/widget/conversations with a verified session (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:web_widget) { create(:channel_widget, account: account) }
  let(:contact) { create(:contact, account: account, email: nil) }
  let(:contact_inbox) { create(:contact_inbox, contact: contact, inbox: web_widget.inbox, hmac_verified: true) }
  let(:other_session) { create(:contact_inbox, contact: contact, inbox: web_widget.inbox, hmac_verified: true) }
  let(:token) { Widget::TokenService.new(payload: { source_id: contact_inbox.source_id, inbox_id: web_widget.inbox.id }).generate_token }

  it 'returns the latest conversation across verified sessions' do
    conversation = create(:conversation, contact: contact, account: account, inbox: web_widget.inbox, contact_inbox: other_session)

    get '/api/v1/widget/conversations', headers: { 'X-Auth-Token' => token }, params: { website_token: web_widget.website_token }, as: :json

    expect(response).to have_http_status(:success)
    expect(response.parsed_body['id']).to eq(conversation.display_id)
  end
end
