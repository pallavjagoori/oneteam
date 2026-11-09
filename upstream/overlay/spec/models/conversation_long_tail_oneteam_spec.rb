# frozen_string_literal: true

require 'rails_helper'

# OneTeam: Conversation paths no Chatwoot spec reaches (auto-resolve message
# keys in whole hours, and two sort scopes).
RSpec.describe Conversation do
  let(:conversation) { create(:conversation) }

  it 'words a whole number of hours as an hours message' do
    expect(conversation.send(:auto_resolve_message_key, 120)).to eq(key: 'auto_resolved_hours', count: 2)
  end

  it 'sorts by priority then oldest first' do
    low = create(:conversation, account: conversation.account, priority: :low)
    urgent = create(:conversation, account: conversation.account, priority: :urgent)

    ids = described_class.where(id: [low.id, urgent.id]).sort_on_priority_created_at.map(&:id)

    expect(ids).to eq([urgent.id, low.id])
  end

  it 'joins conversations to their last incoming message' do
    create(:message, conversation: conversation, message_type: :incoming)

    expect(described_class.last_user_message_at.map(&:id)).to include(conversation.id)
  end
end
