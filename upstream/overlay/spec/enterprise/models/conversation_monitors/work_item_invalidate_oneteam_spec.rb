require 'rails_helper'

RSpec.describe ConversationMonitors::WorkItem do
  let(:account) { create(:account) }
  let(:conversation) { create(:conversation, account: account) }
  let(:monitor) { create(:conversation_monitor, account: account) }

  it 'resets evaluations and bumps the monitor data revision when invalidated' do
    evaluation = monitor.evaluations.create!(account: account, conversation: conversation, status: 'matched')
    revision = monitor.reload.data_revision

    described_class.for_conversation(conversation).request!(invalidate: true)

    expect(evaluation.reload.status).to eq('pending')
    expect(monitor.reload.data_revision).to eq(revision + 1)
  end
end
