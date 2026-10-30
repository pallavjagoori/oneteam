require 'rails_helper'

# OneTeam coverage for GET .../conversations/:id/inbox_assistant, which tells
# the dashboard which Captain assistant (if any) answers in the
# conversation's inbox.
RSpec.describe 'Conversation inbox assistant', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:inbox) { create(:inbox, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }

  def fetch
    get "/api/v1/accounts/#{account.id}/conversations/#{conversation.display_id}/inbox_assistant", headers: admin.create_new_auth_token, as: :json
    response.parsed_body['assistant']
  end

  it 'returns the assistant connected to the inbox' do
    assistant = create(:captain_assistant, account: account, name: 'Cap')
    create(:captain_inbox, captain_assistant: assistant, inbox: inbox)

    expect(fetch).to eq('id' => assistant.id, 'name' => 'Cap')
  end

  it 'returns nil when no assistant answers in the inbox' do
    expect(fetch).to be_nil
  end
end
