require 'rails_helper'

# OneTeam coverage for what happens when an agent sends Copilot a message.
# With copilot_workflows on, the message gets one turn and TurnJob answers
# it; otherwise the older single-response job does. A change still awaiting
# approval is declined either way, so it cannot hold the new message back.
RSpec.describe CopilotMessage do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:thread) { create(:captain_copilot_thread, account: account, user: user) }
  let(:message) { create(:captain_copilot_message, account: account, copilot_thread: thread, message_type: :user) }

  it 'starts one workflow turn for the message' do
    account.enable_features!('copilot_workflows')

    2.times { message.enqueue_response_job(42, user.id) }

    turn = CopilotRun::Turn.find_by!(copilot_message: message)
    expect(turn).to have_attributes(copilot_thread: thread, user: user, conversation_id: 42)
    expect(Captain::Copilot::TurnJob).to have_been_enqueued.with(turn.id).twice
  end

  it 'uses the single-response job without workflows' do
    message.enqueue_response_job(42, user.id)

    expect(Captain::Copilot::ResponseJob).to have_been_enqueued.with(
      assistant: thread.assistant, conversation_id: 42, user_id: user.id, copilot_thread_id: thread.id, message: message.message['content']
    )
  end

  it 'declines a change awaiting approval' do
    account.enable_features!('copilot_workflows')
    create(:label, account: account, title: 'refund')
    turn = start_copilot_turn(account: account, user: user, thread: thread)
    action = copilot_label_action(turn, [create(:conversation, account: account).id])

    message.enqueue_response_job(nil, user.id)

    expect(action.reload).to be_rejected
  end
end
