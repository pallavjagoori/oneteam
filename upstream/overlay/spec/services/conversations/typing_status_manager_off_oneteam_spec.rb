# frozen_string_literal: true

require 'rails_helper'

# OneTeam: turning typing off dispatches the typing-off event.
RSpec.describe Conversations::TypingStatusManager do
  it 'dispatches typing off' do
    conversation = create(:conversation)
    user = create(:user, account: conversation.account)
    allow(Rails.configuration.dispatcher).to receive(:dispatch)

    described_class.new(conversation, user, { typing_status: 'off', is_private: false }).toggle_typing_status

    expect(Rails.configuration.dispatcher).to have_received(:dispatch)
      .with(Events::Types::CONVERSATION_TYPING_OFF, anything, conversation: conversation, user: user, is_private: false)
  end
end
