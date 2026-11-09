# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an evaluation's monitor and conversation must belong to its account.
RSpec.describe ConversationMonitors::Evaluation do
  it 'rejects a conversation from another account' do
    monitor = create(:conversation_monitor)
    evaluation = described_class.new(account: monitor.account, monitor: monitor, conversation: create(:conversation), status: 'pending')
    evaluation.valid?

    expect(evaluation.errors[:account]).to include('must own the monitor and conversation')
  end
end
