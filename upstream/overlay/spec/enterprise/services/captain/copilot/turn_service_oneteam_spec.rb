require 'rails_helper'

# OneTeam coverage for Copilot's workflow turn: the loop that sends the
# agent's message to the model, runs the tools the model calls, parks while
# a review or approval runs in the background, and saves the answer. The
# model is an OpenAI-compatible HTTP endpoint faked with WebMock, so these
# examples also pin the request and response shapes the port must keep.
RSpec.describe Captain::Copilot::TurnService do
  subject(:service) { described_class.new(turn, turn.lease_token) }

  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:turn) { start_copilot_turn(account: account, user: admin, content: 'How many open conversations?') }
  let(:thread_messages) { turn.copilot_thread.copilot_messages.order(:id) }

  include_context 'with a fake OpenAI-compatible model'

  def answer_reply(content, reply_suggestion: false)
    json_reply(content: content, reply_suggestion: reply_suggestion)
  end

  def sent_tool_results
    model_requests.flat_map { |request| request['messages'] }.select { |message| message['role'] == 'tool' }
  end

  before do
    account.enable_features!('copilot_workflows')
    allow(turn.account).to receive(:usage_limits).and_return({ captain: { responses: { current_available: 10 } } })
  end

  it 'answers without tools and finishes the turn' do
    model_replies(answer_reply('There are no open conversations.'))

    expect(service.generate_response).to eq('content' => 'There are no open conversations.', 'reply_suggestion' => false)

    expect(turn.reload).to have_attributes(status: 'completed', lease_token: nil)
    expect(thread_messages.last).to have_attributes(message_type: 'assistant')
    expect(thread_messages.last.message).to include('content' => 'There are no open conversations.', 'run_id' => turn.id)
    expect(turn.transcript['messages'].pluck('role')).to eq(%w[assistant])
  end

  it 'runs a tool the model calls and sends back its result' do
    create_list(:conversation, 2, account: account)
    model_replies(tool_reply('get_data', resource: 'conversations', filters: { status: 'open' }), answer_reply('There are 2.'))

    service.generate_response

    tool_call = turn.tool_calls.find_by!(call_id: 'call_get_data')
    expect(tool_call).to have_attributes(name: 'get_data', status: 'completed', attempts: 1)
    expect(tool_call.result).to include('resource' => 'conversations', 'total' => 2, 'selected' => 2)
    expect(sent_tool_results.last['content']).to include('"total":2')
    expect(thread_messages.assistant_thinking.map { |message| message.message['content'] }).to eq(['Using get_data', 'Completed get_data'])
    expect(turn.reload).to be_completed
  end

  it 'gives the model the error of a tool that fails' do
    model_replies(tool_reply('display', saved_set_id: 999_999), answer_reply('That collection does not exist.'))

    service.generate_response

    tool_call = turn.tool_calls.last
    expect(tool_call).to have_attributes(status: 'failed', error: start_with("Couldn't find CopilotRun"))
    expect(thread_messages.assistant_thinking.last.message['content']).to eq('Failed display')
  end

  it 'reports an unexpected tool error by class' do
    allow(Captain::Copilot::CollectionService).to receive(:new).and_raise(RuntimeError, 'boom')
    model_replies(tool_reply('get_data', resource: 'conversations', filters: {}), answer_reply('Sorry.'))

    service.generate_response

    expect(turn.tool_calls.last.result).to eq('error' => 'Tool failed (RuntimeError)')
  end

  context 'with a review the turn waits on' do
    let(:conversation) { create(:conversation, account: account) }
    let(:collection) { copilot_collection(turn, [conversation.id]) }

    before { model_replies(tool_reply('review_conversations', collection_id: collection.id, criteria: 'Refund?'), answer_reply('1 matched.')) }

    it 'parks the turn until the review finishes, then resumes with its summary' do
      result = service.generate_response

      review = CopilotRun::Review.last
      expect(result).to include(name: 'review_conversations', status: 'running')
      expect(turn.reload).to have_attributes(status: 'awaiting_background_run', lease_token: nil)
      expect(thread_messages.last.message['content']).to eq('Waiting for review_conversations to finish')
      expect(Captain::Copilot::ReviewJob).to have_been_enqueued.with(review.id)

      review.update!(status: :completed)
      turn.resume_with(review.copilot_tool_call, review.summary)
      turn.claim
      described_class.new(turn, turn.lease_token).generate_response

      expect(turn.reload).to be_completed
      expect(thread_messages.last.message['content']).to eq('1 matched.')
      expect(sent_tool_results.last['content']).to include('"status":"completed"')
    end

    it 'requeues at once when the review finished while the turn was parking' do
      allow_any_instance_of(CopilotToolCall).to receive(:completed?).and_wrap_original do |original| # rubocop:disable RSpec/AnyInstance
        caller_locations.any? { |location| location.label.include?('wait_for_background_run') } || original.call
      end

      service.generate_response

      expect(turn.reload).to be_queued
      expect(Captain::Copilot::TurnJob).to have_been_enqueued.with(turn.id)
    end
  end

  it 'uses the summary of a background run that already finished' do
    conversation = create(:conversation, account: account)
    create(:label, account: account, title: 'refund')
    collection = copilot_collection(turn, [conversation.id])
    # The agent rejects the change before the tool returns, as a fast click on the approval card would.
    expiry = double(perform_later: nil) # rubocop:disable RSpec/VerifiedDoubles
    allow(Captain::Copilot::ApprovalExpiryJob).to receive(:set).and_return(expiry)
    allow(expiry).to receive(:perform_later) { |run_id| CopilotRun::Action.find(run_id).reject('No') }
    model_replies(tool_reply('act', saved_set_id: collection.id, action: 'add_labels', arguments: { labels: ['refund'] }),
                  answer_reply('Not changed.'))

    service.generate_response

    expect(turn.tool_calls.find_by(name: 'act').result).to include('status' => 'rejected')
    expect(turn.reload).to be_completed
  end

  it 'stops at the model-call limit' do
    stub_const('Captain::Copilot::TurnService::MAX_MODEL_CALLS', 1)
    model_replies(tool_reply('get_data', resource: 'conversations', filters: {}), answer_reply('Done.'))

    expect { service.generate_response }.to raise_error(Captain::Copilot::LimitExceededError, 'The turn reached its model-call limit')
  end

  it 'tells the model which conversation the agent is viewing' do
    conversation = create(:conversation, account: account)
    turn.update!(conversation_id: conversation.display_id)
    model_replies(answer_reply('This is a refund request.'))

    service.generate_response

    system_prompt = model_requests.first['messages'].first['content']
    expect(system_prompt).to include("Conversation ID: #{conversation.display_id}", "The current account id is #{account.id}")
  end

  context 'with earlier turns in the thread' do
    def answer_turn(content, *replies)
      model_replies(*replies)
      run = start_copilot_turn(account: account, user: admin, thread: turn.copilot_thread, content: content)
      described_class.new(run, run.lease_token).generate_response
      run.reload
    end

    def last_request_messages
      model_requests.last['messages']
    end

    before do
      model_replies(tool_reply('get_data', resource: 'conversations', filters: {}), answer_reply('None yet.'))
      service.generate_response
    end

    it 'replays a recent finished turn whole, with its tool calls' do
      answer_turn('And now?', answer_reply('Still none.'))

      roles = last_request_messages.drop(1).pluck('role')
      expect(roles).to eq(%w[user assistant tool assistant user])
    end

    it 'gives older turns only an outline of their tool calls' do
      stub_const('Captain::Copilot::TurnTranscript::REPLAYED_TURNS', 0)

      answer_turn('And now?', answer_reply('Still none.'))

      outline = last_request_messages.find { |message| message['role'] == 'assistant' && message['content'].to_s.include?('tool_calls') }
      expect(JSON.parse(outline['content'])['tool_calls'].first).to include('name' => 'get_data', 'status' => 'completed')
      expect(last_request_messages.drop(1).pluck('role')).to eq(%w[user assistant assistant user])
    end

    it 'refuses to resume a turn after the model changed' do
      second = start_copilot_turn(account: account, user: admin, thread: turn.copilot_thread, content: 'Again')
      second.update!(transcript: { identity: { model: 'other' }, messages: [] })

      expect { described_class.new(second, second.lease_token).generate_response }
        .to raise_error(ArgumentError, 'The model or provider changed during this run')
    end
  end

  it 'refuses a turn whose agent left the account' do
    AccountUser.find_by(account: account, user: admin).destroy!

    expect { described_class.new(turn, turn.lease_token) }.to raise_error(ArgumentError, 'The user is no longer a member of this account')
  end

  it 'saves the trace context on the first span when tracing is on' do
    allow(ChatwootApp).to receive(:otel_enabled?).and_return(true)
    model_replies(answer_reply('Hi.'))

    service.generate_response

    expect(turn.reload.trace_carrier).to be_a(Hash)
  end
end
