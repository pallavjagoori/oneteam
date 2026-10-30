require 'rails_helper'

# OneTeam coverage for WhatsApp call API errors Chatwoot's spec leaves out:
# a recording upload with no file or for a call with no chat message, and an
# accept that loses the race to another agent (409, so that tab stops
# ringing).
RSpec.describe 'WhatsApp Calls API errors', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:channel) do
    create(:channel_whatsapp, provider: 'whatsapp_cloud', account: account, validate_provider_config: false, sync_templates: false)
  end
  let(:conversation) { create(:conversation, account: account, inbox: channel.inbox) }
  let(:call) do
    create(:call, account: account, inbox: channel.inbox, conversation: conversation, contact: conversation.contact,
                  provider: :whatsapp, direction: :incoming, status: 'ringing', provider_call_id: 'wacid_1')
  end
  let(:url) { "/api/v1/accounts/#{account.id}/whatsapp_calls/#{call.id}" }

  before do
    account.enable_features!('channel_voice')
    create(:inbox_member, user: agent, inbox: channel.inbox)
  end

  def upload(params = {})
    post "#{url}/upload_recording", params: params, headers: agent.create_new_auth_token
  end

  it 'requires a recording file' do
    upload

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['error']).to eq(I18n.t('errors.whatsapp.calls.no_recording'))
  end

  it 'refuses a recording for a call without a chat message' do
    upload(recording: fixture_file_upload(Rails.root.join('spec/assets/sample.mp3'), 'audio/mpeg'))

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['error']).to eq(I18n.t('errors.whatsapp.calls.no_message'))
  end

  it 'returns 409 when another agent already accepted the call' do
    call_service = instance_double(Whatsapp::CallService)
    allow(call_service).to receive(:accept).and_raise(Voice::CallErrors::AlreadyAccepted)
    allow(Whatsapp::CallService).to receive(:new).and_return(call_service)

    post "#{url}/accept", params: { sdp_answer: 'v=0' }, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:conflict)
    expect(response.parsed_body['error']).to eq(I18n.t('errors.whatsapp.calls.already_accepted'))
  end
end
