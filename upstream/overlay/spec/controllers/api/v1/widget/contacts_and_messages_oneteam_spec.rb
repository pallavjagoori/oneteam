require 'rails_helper'

# OneTeam coverage for widget endpoints: removing contact custom attributes,
# submitting values on an input message, and a failing email submission.
RSpec.describe 'Widget contacts and messages (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:web_widget) { create(:channel_widget, account: account) }
  let(:contact) { create(:contact, account: account, email: nil, custom_attributes: { 'plan' => 'pro', 'seat' => 3 }) }
  let(:contact_inbox) { create(:contact_inbox, contact: contact, inbox: web_widget.inbox) }
  let(:conversation) { create(:conversation, contact: contact, account: account, inbox: web_widget.inbox, contact_inbox: contact_inbox) }
  let(:token) { Widget::TokenService.new(payload: { source_id: contact_inbox.source_id, inbox_id: web_widget.inbox.id }).generate_token }
  let(:auth) { { 'X-Auth-Token' => token } }

  it 'removes the named custom attributes' do
    post '/api/v1/widget/contact/destroy_custom_attributes',
         params: { website_token: web_widget.website_token, custom_attributes: ['plan'] }, headers: auth, as: :json

    expect(response).to have_http_status(:success)
    expect(contact.reload.custom_attributes).to eq('seat' => 3)
  end

  it 'stores submitted values on an input message' do
    message = create(:message, account: account, inbox: web_widget.inbox, conversation: conversation, content_type: 'input_select',
                               content_attributes: { items: [{ title: 'Yes', value: 'yes' }] })

    put api_v1_widget_message_url(message.id),
        params: { website_token: web_widget.website_token, message: { submitted_values: [{ title: 'Yes', value: 'yes' }] } },
        headers: auth, as: :json

    expect(response).to have_http_status(:success)
    expect(message.reload.content_attributes['submitted_values']).to eq([{ 'title' => 'Yes', 'value' => 'yes' }])
  end

  it 'answers 500 when the email submission fails' do
    message = create(:message, account: account, inbox: web_widget.inbox, conversation: conversation, content_type: 'input_email')
    allow(ContactIdentifyAction).to receive(:new).and_raise(StandardError, 'boom')

    put api_v1_widget_message_url(message.id),
        params: { website_token: web_widget.website_token, contact: { email: 'v@example.com' } }, headers: auth, as: :json

    expect(response).to have_http_status(:internal_server_error)
    expect(response.parsed_body['message']).to eq('boom')
  end
end
