# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the pending action moves the conversation to pending.
RSpec.describe ActionService do
  it 'marks the conversation pending' do
    conversation = create(:conversation, status: :open)

    described_class.new(conversation).pending_conversation(nil)

    expect(conversation.reload).to be_pending
  end
end
