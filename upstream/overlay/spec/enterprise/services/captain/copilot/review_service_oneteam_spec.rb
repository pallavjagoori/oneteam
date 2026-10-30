require 'rails_helper'

# OneTeam coverage for how Copilot's review model reads one conversation.
# It sees the opening and newest messages within a character budget (long
# messages keep both ends), answers with a verdict that must cite messages it
# was shown, and a first-pass "no" on a cut message asks for a deep pass.
# The model is a faked OpenAI-compatible endpoint.
RSpec.describe Captain::Copilot::ReviewService do
  subject(:service) { described_class.new(review) }

  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:conversation) { create(:conversation, account: account, priority: :high) }
  let(:turn) { start_copilot_turn(account: account, user: admin) }
  let(:review) { copilot_review(turn, copilot_collection(turn, [conversation.id]), question: 'Refund?') }
  let!(:opening) { create(:message, conversation: conversation, account: account, message_type: :incoming, content: 'I want my money back') }
  let(:verdict) do
    { matched: true, needs_more_history: false, category: 'refund', reason: 'Asks for money back', evidence_message_ids: [opening.id] }
  end

  include_context 'with a fake OpenAI-compatible model'

  def sent_review
    JSON.parse(model_requests.last['messages'].last['content'])
  end

  # A review reads messages up to the moment its collection was saved; move that moment past messages added in an example.
  def save_collection_now
    collection = review.source_run
    collection.update!(context: collection.context.merge('as_of' => Time.current.iso8601(6)))
  end

  before do
    account.enable_features!('copilot_workflows')
    allow(review.account).to receive(:usage_limits).and_return({ captain: { responses: { current_available: 10 } } })
    turn.copilot_thread.assistant.update!(config: { 'product_name' => 'Acme Cloud' })
  end

  it 'sends the conversation with the request and criteria, and returns the verdict' do
    model_replies(json_reply(verdict))

    result = service.review(conversation)

    expect(result).to eq(status: :reviewed, matched: true, category: 'refund', reason: 'Asks for money back', evidence_message_ids: [opening.id],
                         reviewed_message_ids: [opening.id], history_truncated: false)
    expect(sent_review).to include('product' => 'Acme Cloud', 'request' => 'Find refund requests', 'question' => 'Refund?',
                                   'criteria' => 'Is the customer asking for a refund?')
    expect(sent_review['conversation']).to include('display_id' => conversation.display_id, 'priority' => 'high', 'omitted_messages' => 0)
    expect(sent_review['conversation']['messages'].first).to include('id' => opening.id, 'sender' => 'customer', 'content_truncated' => false)
    expect(model_requests.last['response_format']['type']).to eq('json_schema')
    expect(turn.reload.total_cost_usd).to be >= 0
  end

  it 'reads only the opening and newest messages of a long conversation' do
    create_list(:message, 9, conversation: conversation, account: account, message_type: :outgoing, content: 'Update')
    save_collection_now
    model_replies(json_reply(verdict))

    service.review(conversation)

    expect(sent_review['conversation']).to include('history_truncated' => true, 'omitted_messages' => 2)
    expect(sent_review['conversation']['messages'].size).to eq(8)
  end

  it 'reads more messages on the deep pass' do
    create_list(:message, 9, conversation: conversation, account: account, message_type: :outgoing, content: 'Update')
    save_collection_now
    model_replies(json_reply(verdict))

    service.review(conversation, deep: true)

    expect(sent_review['conversation']['messages'].size).to eq(10)
  end

  context 'with a message longer than its share of the budget' do
    before do
      stub_const('Captain::Copilot::ReviewService::FIRST_PASS', { opening: 3, latest: 5, characters: 40 })
      create(:message, conversation: conversation, account: account, message_type: :incoming, content: "Hello#{'x' * 100}Bye")
      save_collection_now
    end

    it 'keeps both ends of the long message and the short one whole' do
      model_replies(json_reply(verdict))

      service.review(conversation)

      short, long = sent_review['conversation']['messages']
      expect(short).to include('content' => 'I want my money back', 'content_truncated' => false)
      expect(long['content']).to start_with('Hello').and(end_with('Bye')).and(include('characters cut ...]'))
      expect(long['content_truncated']).to be(true)
    end

    it 'asks for a deep pass instead of ruling out on cut text' do
      model_replies(json_reply(verdict.merge(matched: false, evidence_message_ids: [])))

      expect(service.review(conversation)).to include(status: :needs_more_history, matched: false)
    end
  end

  it 'leaves out messages sent after the collection was saved' do
    create(:message, conversation: conversation, account: account, message_type: :incoming, content: 'Never mind', created_at: 1.minute.from_now)
    model_replies(json_reply(verdict))

    service.review(conversation)

    expect(sent_review['conversation']['messages'].pluck('content')).to eq(['I want my money back'])
  end

  it 'passes on the model asking for more history' do
    model_replies(json_reply(matched: false, needs_more_history: true, category: '', reason: '', evidence_message_ids: []))

    expect(service.review(conversation, deep: true)).to include(status: :needs_more_history, matched: false)
  end

  it 'accepts a no on the deep pass' do
    model_replies(json_reply(verdict.merge(matched: false, evidence_message_ids: [])))

    expect(service.review(conversation, deep: true)).to include(status: :reviewed, matched: false)
  end

  {
    'Review verdicts must be booleans' => { matched: 'yes' },
    'Evidence IDs must come from the reviewed messages' => { evidence_message_ids: [0] },
    'Reviewed findings need a category and reason' => { reason: '' },
    'Matched findings need supporting evidence' => { evidence_message_ids: [] }
  }.each do |error, change|
    it "rejects an answer where #{error.downcase}" do
      model_replies(json_reply(verdict.merge(change)))

      expect { service.review(conversation) }.to raise_error(ArgumentError, error)
    end
  end

  it 'stops before calling the model when workflows are off' do
    account.disable_features!('copilot_workflows')

    expect { service.review(conversation) }.to raise_error(Captain::Copilot::LimitExceededError)
  end
end
