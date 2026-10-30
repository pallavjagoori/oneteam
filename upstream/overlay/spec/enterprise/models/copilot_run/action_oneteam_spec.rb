require 'rails_helper'

# OneTeam coverage for a change Copilot proposes (CopilotRun::Action). It
# waits on an approval card for five minutes; approving queues ActionJob,
# rejecting or expiring hands the decision back to the waiting turn, and a
# new message from the agent supersedes it.
RSpec.describe CopilotRun::Action do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:conversations) { create_list(:conversation, 2, account: account) }
  let(:turn) { start_copilot_turn(account: account, user: user) }
  let(:action) { copilot_label_action(turn, conversations.map(&:id)) }

  # The act tool proposes the change while the turn holds its lease; the turn then parks until the agent decides.
  before do
    account.enable_features!('copilot_workflows')
    create(:label, account: account, title: 'refund')
    action
    turn.update!(status: :awaiting_background_run)
  end

  it 'shows an approval card with the count and links' do
    card = action.approval_card

    expect(card).to be_assistant_approval
    expect(card.message['approval']).to include('status' => 'awaiting_approval', 'action' => 'add_labels', 'count' => 2)
    expect(card.message['approval']['targets'].size).to eq(2)
    expect(action.approval_status).to eq('awaiting_approval')
  end

  it 'queues the change when approved, and only once' do
    expect(action.approve).to be(true)
    expect(Captain::Copilot::ActionJob).to have_been_enqueued.with(action.id)
    expect(action.reload).to be_queued
    expect(action.approval_status).to eq('approved')
    expect(action.approval_card.message['approval']['status']).to eq('approved')

    expect(action.approve).to be(false)
  end

  it 'expires instead of approving after five minutes, and wakes the turn' do
    action.update_column(:created_at, 6.minutes.ago) # rubocop:disable Rails/SkipsModelValidations

    expect(action.approve).to be(false)
    expect(action.reload).to be_expired
    expect(action.context['decision_reason']).to eq(I18n.t('captain.copilot.approval_expired', minutes: 5))
    expect(action.copilot_tool_call.reload).to be_completed
    expect(Captain::Copilot::TurnJob).to have_been_enqueued.with(turn.id)
  end

  it 'records the reason when rejected and gives the turn the summary' do
    expect(action.reject('Not now')).to be(true)

    expect(action.reload).to be_rejected
    expect(action.copilot_tool_call.reload.result).to include('status' => 'rejected', 'decision_reason' => 'Not now', 'targets' => 2)
    expect(action.reject('Again')).to be(false)
  end

  it 'is superseded by a newer message, ending the waiting turn incomplete' do
    expect(action.supersede).to be(true)

    expect(action.reload).to be_rejected
    expect(action.context['decision_reason']).to eq(I18n.t('captain.copilot.approval_superseded'))
    expect(turn.reload).to be_incomplete
    expect(action.supersede).to be(false)
  end

  it 'keeps a turn that is still running when superseded' do
    turn.update!(status: :running)

    action.supersede

    expect(turn.reload).to be_running
  end

  describe '#summary' do
    it 'counts applied, skipped and failed changes and those never reached' do
      action.update!(status: :completed)
      action.action_items.create!(record_id: conversations.first.id, status: :applied)

      expect(action.summary).to include(action: 'add_labels', arguments: { 'labels' => ['refund'] }, targets: 2, applied: 1,
                                        skipped: 0, failed: 0, not_processed: 1)
      expect(action.remaining_ids).to eq([conversations.last.id])
    end

    it 'has no not_processed count while the change is still running' do
      action.update!(status: :running)

      expect(action.summary).not_to have_key(:not_processed)
    end

    it 'posts progress to the thread once per change in the counts' do
      action.update!(status: :running)
      action.action_items.create!(record_id: conversations.first.id, status: :skipped)

      expect { 2.times { action.publish_progress } }.to change(action.copilot_thread.copilot_messages.assistant_thinking, :count).by(1)
      expect(action.copilot_thread.copilot_messages.last.message['content']).to eq('Applied 0 of 2 changes: 1 already done, 0 failed.')
    end
  end

  it 'builds the action it proposes' do
    expect(action.action).to be_a(Captain::Copilot::Actions::AddLabels)
  end
end
