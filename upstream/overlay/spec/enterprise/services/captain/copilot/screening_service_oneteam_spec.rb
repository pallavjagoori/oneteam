require 'rails_helper'

# OneTeam coverage for screening before a Copilot review. When the review
# has a yes/no question, Jev scores each new conversation; a clear no is
# screened out and never reaches the review model. Anything Jev cannot read
# whole, or fails on, is kept for review, and an auth or rate limit error
# stops screening for the rest of the batch. Jev is a double here.
RSpec.describe Captain::Copilot::ScreeningService do
  subject(:service) { described_class.new(review, review.lease_token) }

  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:conversations) { create_list(:conversation, 3, account: account) }
  let(:turn) { start_copilot_turn(account: account, user: admin) }
  let(:review) do
    copilot_review(turn, copilot_collection(turn, conversations.map(&:id)), question: 'Is the customer asking for a refund?').tap(&:claim)
  end
  let(:client) { instance_double(Captain::JevClient) }

  def jev_answer(score, cost: 0.001)
    { 'answers' => { 'match' => { 'noul' => score } }, 'usage' => { 'cost' => cost } }
  end

  before do
    conversations.each { |conversation| create(:message, conversation: conversation, account: account, message_type: :incoming, content: 'Hi') }
    allow(Captain::JevClient).to receive(:new).with(account_id: account.id, feature: 'copilot_screening').and_return(client)
    allow(review).to receive(:ensure_can_continue!)
  end

  it 'is available when a Jev key is configured' do
    allow(Captain::JevClient).to receive(:api_key).and_return('key')
    expect(described_class).to be_available

    allow(Captain::JevClient).to receive(:api_key).and_return(nil)
    expect(described_class).not_to be_available
  end

  it 'keeps every conversation when the review has no question' do
    review.update!(question: nil)

    expect(service.screen(conversations)).to eq(conversations)
  end

  it 'screens out clear noes and keeps the rest, saving each score and its cost' do
    allow(client).to receive(:call).and_return(jev_answer(0.05), jev_answer(0.8), jev_answer(0.1))

    kept = service.screen(conversations)

    expect(kept).to eq(conversations.drop(1))
    expect(review.findings.order(:id).pluck(:status, :screening_score)).to eq([['screened_out', 0.05], ['awaiting_review', 0.8],
                                                                               ['awaiting_review', 0.1]])
    expect(turn.reload.total_cost_usd).to eq(BigDecimal('0.003'))
    expect(client).to have_received(:call).with(body: include('Is the customer asking for a refund?')).thrice
  end

  it 'does not screen a conversation twice' do
    review.findings.create!(conversation_id: conversations.first.id, status: :needs_more_history)
    review.findings.create!(conversation_id: conversations.second.id, status: :screened_out)
    allow(client).to receive(:call).and_return(jev_answer(0.9))

    expect(service.screen(conversations)).to eq([conversations.first, conversations.last])
    expect(client).to have_received(:call).once
  end

  it 'keeps long conversations for the review model unscreened' do
    stub_const('Captain::Copilot::ScreeningService::WINDOW', 1)
    create(:message, conversation: conversations.first, account: account, message_type: :outgoing, content: 'Hello')
    stub_const('Captain::Copilot::ScreeningService::CHARACTER_BUDGET', 1)
    allow(client).to receive(:call)

    expect(service.screen(conversations)).to eq(conversations)
    expect(review.findings.pluck(:screening_score)).to all(be_nil)
    expect(client).not_to have_received(:call)
  end

  it 'keeps a conversation when Jev returns no number' do
    allow(client).to receive(:call).and_return({ 'answers' => {} })

    expect(service.screen(conversations.first(1))).to eq(conversations.first(1))
  end

  it 'stops screening the batch after a rate limit' do
    response = instance_double(Faraday::Response, status: 429, headers: { 'retry-after' => '30' }, body: 'slow down')
    allow(client).to receive(:call).and_raise(Captain::JevClient::HTTPError.new(response))

    expect(service.screen(conversations)).to eq(conversations)
    expect(client).to have_received(:call).once
    expect(turn.reload.cost_complete).to be(false)
  end

  it 'keeps screening after a one-off failure' do
    allow(client).to receive(:call).and_raise(Faraday::TimeoutError)

    service.screen(conversations)

    expect(client).to have_received(:call).thrice
  end

  it 'still saves the score when the cost cannot be recorded' do
    allow(client).to receive(:call).and_return(jev_answer(0.9))
    allow(review).to receive(:record_cost!).and_raise(ActiveRecord::LockWaitTimeout)

    expect(service.screen(conversations.first(1))).to eq(conversations.first(1))
    expect(review.findings.first.screening_score).to eq(0.9)
  end

  context 'with OpenTelemetry on' do
    before do
      allow(ChatwootApp).to receive(:otel_enabled?).and_return(true)
      allow(client).to receive(:call).and_return(jev_answer(0.9))
    end

    it 'traces the batch inside the turn trace' do
      turn.update!(trace_carrier: { 'traceparent' => '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01' })

      expect(service.screen(conversations.first(1))).to eq(conversations.first(1))
    end

    it 'starts a new trace when the turn has none' do
      expect(service.screen(conversations.first(1))).to eq(conversations.first(1))
    end
  end
end
