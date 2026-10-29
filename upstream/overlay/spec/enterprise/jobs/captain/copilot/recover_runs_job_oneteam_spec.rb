require 'rails_helper'

# OneTeam coverage for the backstop that restarts Copilot runs a dead
# worker left behind: queued or expired runs get their job again, finished
# background runs wake their turn, and overdue approvals expire.
RSpec.describe Captain::Copilot::RecoverRunsJob do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:turn) { start_copilot_turn(account: account, user: admin) }

  before { account.enable_features!('copilot_workflows') }

  def make_stale(run)
    run.update_column(:updated_at, 10.minutes.ago) # rubocop:disable Rails/SkipsModelValidations
  end

  it 'requeues a stale queued turn, but not one behind an earlier turn' do
    turn.release!(:queued)
    later = start_copilot_turn(account: account, user: admin, thread: turn.copilot_thread).tap { |run| run.release!(:queued) }
    [turn, later].each { |run| make_stale(run) }

    described_class.perform_now

    expect(Captain::Copilot::TurnJob).to have_been_enqueued.with(turn.id).once
    expect(Captain::Copilot::TurnJob).not_to have_been_enqueued.with(later.id)
  end

  it 'requeues a review whose lease expired' do
    review = copilot_review(turn, copilot_collection(turn, [1]))
    review.claim
    review.update!(lease_until: 1.minute.ago)
    make_stale(review)

    described_class.perform_now

    expect(Captain::Copilot::ReviewJob).to have_been_enqueued.with(review.id)
  end

  it 'wakes the turn of a review that finished without waking it' do
    review = copilot_review(turn, copilot_collection(turn, [1]), status: :completed)
    turn.update!(status: :awaiting_background_run)
    make_stale(review)

    described_class.perform_now

    expect(review.copilot_tool_call.reload).to be_completed
    expect(turn.reload).to be_queued
  end

  it 'expires approvals nobody answered' do
    create(:label, account: account, title: 'refund')
    action = copilot_label_action(turn, [create(:conversation, account: account).id])
    action.update_column(:created_at, 10.minutes.ago) # rubocop:disable Rails/SkipsModelValidations

    described_class.perform_now

    expect(action.reload).to be_expired
  end
end
