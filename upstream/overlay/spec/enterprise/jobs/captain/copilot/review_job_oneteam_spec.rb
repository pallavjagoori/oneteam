require 'rails_helper'

# OneTeam coverage for the background review of a Copilot collection. Each
# batch is screened, then each conversation is reviewed by the model (a
# double here). A first pass can ask for more history, a deep pass runs
# next, and a review stops at its turn's limit.
RSpec.describe Captain::Copilot::ReviewJob do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:conversations) { create_list(:conversation, 3, account: account) }
  let(:turn) { start_copilot_turn(account: account, user: admin) }
  let(:collection) { copilot_collection(turn, conversations.map(&:id)) }
  let(:review) { copilot_review(turn, collection) }
  let(:reviewer) { instance_double(Captain::Copilot::ReviewService) }
  let(:verdict) { { status: :reviewed, matched: true, category: 'refund', reason: 'Asked for money back', evidence_message_ids: [] } }

  before do
    account.enable_features!('copilot_workflows')
    review
    turn.update!(status: :awaiting_background_run)
    screening = instance_double(Captain::Copilot::ScreeningService)
    allow(screening).to receive(:screen) { |batch| batch }
    allow(Captain::Copilot::ScreeningService).to receive(:new).and_return(screening)
    allow(Captain::Copilot::ReviewService).to receive(:new).with(review).and_return(reviewer)
    allow(reviewer).to receive(:review).and_return(verdict)
  end

  it 'reviews every conversation, saves findings and wakes the turn' do
    described_class.perform_now(review.id)

    expect(review.reload).to be_completed
    expect(review.findings.pluck(:status, :matched)).to all(eq(['reviewed', true]))
    expect(turn.reload).to be_queued
    expect(review.copilot_thread.copilot_messages.assistant_thinking.last.message['content']).to start_with('Processed 3 of 3')
  end

  it 'reads more history when the first pass asks for it' do
    first = conversations.first
    allow(reviewer).to receive(:review).with(first, deep: false).and_return(verdict.merge(status: :needs_more_history, matched: false))
    stub_const('Captain::Copilot::BackgroundRunJob::BATCH_SIZE', 1)

    described_class.perform_now(review.id)
    expect(review.findings.find_by(conversation_id: first.id)).to be_needs_more_history

    described_class.perform_now(review.id)
    expect(reviewer).to have_received(:review).with(first, deep: true)
    expect(review.findings.find_by(conversation_id: first.id)).to be_reviewed
  end

  it 'fails a conversation the deep pass still cannot decide' do
    allow(reviewer).to receive(:review).and_return(verdict.merge(status: :needs_more_history))
    review.findings.create!(conversation_id: conversations.first.id, status: :needs_more_history)

    described_class.perform_now(review.id)

    expect(review.findings.find_by(conversation_id: conversations.first.id))
      .to have_attributes(status: 'failed', error: 'The 50 messages read were insufficient')
  end

  it 'retries a conversation once after an invalid model answer, then fails it' do
    allow(reviewer).to receive(:review).and_raise(ArgumentError, 'Review verdicts must be booleans')
    stub_const('Captain::Copilot::BackgroundRunJob::BATCH_SIZE', 3)

    described_class.perform_now(review.id)
    expect(review.findings.pluck(:status).uniq).to eq(['awaiting_retry'])

    described_class.perform_now(review.id)
    expect(review.findings.pluck(:status, :error).uniq).to eq([['failed', 'Review verdicts must be booleans']])
    expect(review.reload).to be_incomplete
  end

  it 'names other review errors by class' do
    allow(reviewer).to receive(:review).and_raise(Timeout::Error)

    described_class.perform_now(review.id)

    expect(review.findings.first.error).to eq('Review failed (Timeout::Error)')
  end

  it 'does not overwrite a finding that was already reviewed' do
    review.findings.create!(conversation_id: conversations.first.id, status: :reviewed, matched: false, category: 'other', reason: 'Kept')
    review.findings.create!(conversation_id: conversations.second.id, status: :awaiting_retry, attempts: 1)
    review.update!(status: :queued)

    described_class.perform_now(review.id)

    expect(review.findings.find_by(conversation_id: conversations.first.id).reason).to eq('Kept')
  end

  it 'records conversations the agent can no longer open' do
    conversations.last.destroy!

    described_class.perform_now(review.id)

    expect(review.findings.find_by(conversation_id: conversations.last.id)).to have_attributes(status: 'awaiting_retry',
                                                                                               error: 'Conversation is no longer accessible')
  end

  it 'stops at the turn limit' do
    review.update!(turn_limit: 2)

    described_class.perform_now(review.id)

    expect(review.reload).to be_incomplete
    expect(review.findings.count).to eq(2)
  end

  it 'ends incomplete when the selection was cut' do
    collection.update!(context: collection.context.merge('selection_truncated' => true))

    described_class.perform_now(review.id)

    expect(review.reload).to be_incomplete
  end

  it 'stops when Captain credits run out' do
    allow(reviewer).to receive(:review).and_raise(Captain::Copilot::LimitExceededError, 'No credits')

    described_class.perform_now(review.id)

    expect(review.reload).to have_attributes(status: 'incomplete', error: 'No credits')
  end
end
