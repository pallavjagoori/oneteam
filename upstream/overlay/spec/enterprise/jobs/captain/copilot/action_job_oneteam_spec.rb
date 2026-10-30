require 'rails_helper'

# OneTeam coverage for applying an approved Copilot change. ActionJob works
# under the run's lease in batches, rechecks access to each record right
# before changing it, retries a failed change once, and hands the summary
# back to the turn that proposed it.
RSpec.describe Captain::Copilot::ActionJob do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:conversations) { create_list(:conversation, 2, account: account) }
  let(:turn) { start_copilot_turn(account: account, user: admin) }
  let(:action) { copilot_label_action(turn, conversations.map(&:id)) }

  before do
    account.enable_features!('copilot_workflows')
    create(:label, account: account, title: 'refund')
    action
    turn.update!(status: :awaiting_background_run)
    action.approve
  end

  it 'applies the change, posts progress and wakes the turn' do
    described_class.perform_now(action.id)

    expect(conversations.map { |conversation| conversation.reload.label_list }).to all(eq(['refund']))
    expect(action.reload).to be_completed
    expect(action.action_items.pluck(:status)).to all(eq('applied'))
    expect(action.copilot_thread.copilot_messages.assistant_thinking.last.message['content']).to start_with('Applied 2 of 2 changes')
    expect(turn.reload).to be_queued
    expect(Captain::Copilot::TurnJob).to have_been_enqueued.with(turn.id)
  end

  it 'counts a record that already has the change as skipped' do
    conversations.first.update!(label_list: ['refund'])

    described_class.perform_now(action.id)

    expect(action.summary).to include(applied: 1, skipped: 1)
  end

  it 'continues in the next job after a batch' do
    stub_const('Captain::Copilot::BackgroundRunJob::BATCH_SIZE', 1)

    described_class.perform_now(action.id)

    expect(action.reload).to be_queued
    expect(action.action_items.count).to eq(1)
    # Once on approval, once more to continue.
    expect(described_class).to have_been_enqueued.with(action.id).twice
  end

  it 'marks a record the agent can no longer open as failed and ends incomplete' do
    conversations.first.destroy!

    described_class.perform_now(action.id)

    expect(action.reload).to be_incomplete
    expect(action.action_items.find_by(record_id: conversations.first.id)).to have_attributes(status: 'failed',
                                                                                              error: 'Record is no longer accessible')
  end

  it 'retries a failed change once, then gives up on it' do
    stub_const('Captain::Copilot::BackgroundRunJob::BATCH_SIZE', 1)
    allow_any_instance_of(Captain::Copilot::Actions::AddLabels).to receive(:perform).and_raise(RuntimeError) # rubocop:disable RSpec/AnyInstance

    described_class.perform_now(action.id)
    item = action.action_items.first
    expect(item).to have_attributes(status: 'awaiting_retry', error: 'Change failed (RuntimeError)', attempts: 1)

    described_class.perform_now(action.id)
    expect(item.reload).to have_attributes(status: 'failed', attempts: 2)
  end

  it 'stops with the reason when the label was deleted after approval' do
    account.labels.find_by(title: 'refund').destroy!

    described_class.perform_now(action.id)

    expect(action.reload).to have_attributes(status: 'incomplete', error: start_with('Unknown labels: refund'))
    expect(conversations.first.reload.label_list).to be_empty
  end

  it 'stops when workflows are turned off partway' do
    account.disable_features!('copilot_workflows')

    described_class.perform_now(action.id)

    expect(action.reload).to have_attributes(status: 'incomplete', error: I18n.t('captain.copilot_workflows_disabled'))
  end

  it 'requeues after an unexpected error, and finishes after three' do
    allow(Captain::Copilot::Resources).to receive(:build).and_raise(RuntimeError, 'database hiccup')

    described_class.perform_now(action.id)
    expect(action.reload).to have_attributes(status: 'queued', attempts: 1, error: 'RuntimeError')
    expect(described_class).to have_been_enqueued.with(action.id).twice

    2.times { described_class.perform_now(action.id) }
    expect(action.reload).to have_attributes(status: 'incomplete', attempts: 3)
  end

  it 'does nothing for a change that is not approved or is held by a live worker' do
    rejected = copilot_label_action(start_copilot_turn(account: account, user: admin), [conversations.first.id])

    described_class.perform_now(rejected.id)
    expect(rejected.reload).to be_awaiting_approval

    token = action.claim
    described_class.perform_now(action.id)
    expect(action.reload.lease_token).to eq(token)
  end

  it 'counts taking over an expired lease as a failed attempt' do
    action.claim
    action.update!(lease_until: 1.second.ago)

    described_class.perform_now(action.id)

    expect(action.reload).to have_attributes(status: 'queued', attempts: 1, error: 'Captain::Copilot::LeaseExpiredError')
  end

  it 'stops quietly when another worker takes the lease mid-change' do
    allow_any_instance_of(Captain::Copilot::Actions::AddLabels).to receive(:perform).and_raise(Captain::Copilot::LeaseLostError) # rubocop:disable RSpec/AnyInstance

    expect { described_class.perform_now(action.id) }.not_to raise_error
    expect(action.action_items).to be_empty
  end

  it 'stops quietly when the lease is lost while recording a failure' do
    allow(Captain::Copilot::Resources).to receive(:build).and_raise(RuntimeError)
    allow_any_instance_of(CopilotRun::Action).to receive(:with_lease).and_raise(Captain::Copilot::LeaseLostError) # rubocop:disable RSpec/AnyInstance

    expect { described_class.perform_now(action.id) }.not_to raise_error
    expect(action.reload.attempts).to eq(0)
  end

  it 'keeps watching a run whose lease is still live' do
    token = action.claim

    expect { described_class.perform_now(action.id, token) }.to have_enqueued_job(described_class).with(action.id, token)
  end
end
