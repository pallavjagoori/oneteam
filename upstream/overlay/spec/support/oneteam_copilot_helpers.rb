# Builders for OneTeam's Captain Copilot workflow specs. Copilot answers an
# agent's message with a turn (CopilotRun::Turn) that calls tools; get_data
# saves a collection, review_conversations starts a review, and act proposes
# a change that waits on an approval card. These helpers create that state
# the way the tools do, so specs can start from any point of the flow.
module OneteamCopilotHelpers
  # A thread with one agent message and the running turn that answers it.
  # Returns the turn; its lease token is on #lease_token, as a worker holds it.
  def start_copilot_turn(account:, user:, content: 'Find refund requests', thread: nil)
    thread ||= create(:captain_copilot_thread, account: account, user: user)
    message = create(:captain_copilot_message, account: account, copilot_thread: thread, message_type: :user, message: { content: content })
    turn = CopilotRun::Turn.create!(account: account, user: user, copilot_thread: thread, copilot_message: message)
    turn.claim
    turn
  end

  # A Copilot tool bound to the turn and to a new tool call, as the turn sets it up before calling the tool.
  def copilot_tool(tool_class, turn, call_id: SecureRandom.hex(4))
    tool = tool_class.new(turn.copilot_thread.assistant, run: turn, lease_token: turn.lease_token, user: turn.user)
    tool.tool_call = turn.tool_calls.create!(call_id: call_id, name: tool_class.name, status: :running)
    tool
  end

  # A saved collection of record IDs, as get_data leaves it.
  def copilot_collection(turn, ids, resource: 'conversations', truncated: false, filters: {})
    CopilotRun::Collection.create!(account: turn.account, user: turn.user, copilot_thread: turn.copilot_thread, status: :completed,
                                   copilot_tool_call: turn.tool_calls.create!(call_id: SecureRandom.hex(4), name: 'get_data', status: :completed),
                                   context: { resource: resource, filters: filters, selected_ids: ids, as_of: Time.current.iso8601(6),
                                              selection_truncated: truncated })
  end

  # A review of a collection, started by a new tool call of the turn.
  # Options override the review context (criteria, question, turn_limit and so on).
  def copilot_review(turn, collection, status: :queued, **context)
    tool_call = turn.tool_calls.create!(call_id: SecureRandom.hex(4), name: 'review_conversations', status: :running)
    defaults = { request: 'Find refund requests', criteria: 'Is the customer asking for a refund?', turn_start: 0, turn_limit: 300 }
    CopilotRun::Review.create!(account: turn.account, user: turn.user, copilot_thread: turn.copilot_thread, copilot_tool_call: tool_call,
                               source_run: collection, status: status, context: defaults.merge(context).compact)
  end

  # A proposed add_labels change awaiting approval, with its approval card, as the act tool leaves it.
  def copilot_label_action(turn, conversation_ids, labels: ['refund'])
    collection = copilot_collection(turn, conversation_ids)
    copilot_tool(Captain::Tools::Copilot::ActService, turn)
      .execute(saved_set_id: collection.id, action: 'add_labels', arguments: { labels: labels })
    CopilotRun::Action.last
  end
end

RSpec.configure do |config|
  config.include OneteamCopilotHelpers
end
