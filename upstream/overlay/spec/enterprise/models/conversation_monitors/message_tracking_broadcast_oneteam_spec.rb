require 'rails_helper'

RSpec.describe ConversationMonitors::MessageTracking do
  it 'schedules a broadcast for every monitor that evaluated the conversation' do
    message = create(:message)
    monitor = create(:conversation_monitor, account: message.account)
    monitor.evaluations.create!(account: message.account, conversation: message.conversation, status: 'matched')
    message.instance_variable_set(:@monitor_work_requested, true)
    message.instance_variable_set(:@monitor_content_invalidated, true)
    allow(ConversationMonitors::Scheduler).to receive(:wake)
    allow(ConversationMonitors::BroadcastJob).to receive(:schedule)

    message.send(:wake_monitor_evaluation)

    expect(ConversationMonitors::BroadcastJob).to have_received(:schedule).with(monitor.id)
  end
end
