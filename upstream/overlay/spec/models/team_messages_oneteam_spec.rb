# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a team's messages are those of its conversations.
RSpec.describe Team do
  it 'lists the messages of the team conversations only' do
    team = create(:team)
    conversation = create(:conversation, account: team.account, team: team)
    message = create(:message, account: team.account, inbox: conversation.inbox, conversation: conversation)
    create(:message, account: team.account)

    expect(team.messages).to contain_exactly(message)
  end
end
