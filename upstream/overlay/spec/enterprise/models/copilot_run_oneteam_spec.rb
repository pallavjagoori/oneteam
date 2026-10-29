require 'rails_helper'

# OneTeam coverage for the lease every Copilot run works under. A worker
# claims a run for two minutes and must hold the lease token for every
# write; an expired lease can be taken over, and the feature flag and
# Captain credits are checked before each step.
RSpec.describe CopilotRun do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:turn) { start_copilot_turn(account: account, user: user) }

  before { account.enable_features!('copilot_workflows') }

  describe '#claim' do
    it 'refuses a run another worker holds, then lets a worker take over an expired lease' do
      expect(turn.claim).to be_nil

      turn.update!(lease_until: 1.second.ago)
      token = turn.claim

      expect(token).to be_present
      expect(turn).to be_taken_over
    end

    it 'refuses finished, parked and waiting runs' do
      %i[completed awaiting_background_run].each do |status|
        turn.update!(status: status, lease_until: nil)
        expect(turn.claim).to be_nil
      end
    end

    it 'is not a takeover for a queued run' do
      turn.release!(:queued)

      expect(turn.claim).to be_present
      expect(turn).not_to be_taken_over
    end
  end

  describe '#with_lease' do
    it 'runs the block only for the current holder' do
      expect(turn.with_lease(turn.lease_token) { :done }).to eq(:done)
      expect { turn.with_lease('stale') { :done } }.to raise_error(Captain::Copilot::LeaseLostError)
    end

    it 'renews and releases the lease' do
      turn.update!(lease_until: 10.seconds.from_now)

      turn.renew_lease(turn.lease_token)
      expect(turn.reload.lease_until).to be > 1.minute.from_now

      turn.release!(:completed, error: nil)
      expect(turn.reload).to have_attributes(status: 'completed', lease_token: nil, lease_until: nil)
      expect(turn).to be_finished
    end
  end

  describe '#ensure_can_continue!' do
    it 'stops when workflows are turned off' do
      account.disable_features!('copilot_workflows')

      expect { turn.ensure_can_continue! }.to raise_error(Captain::Copilot::LimitExceededError, I18n.t('captain.copilot_workflows_disabled'))
    end

    it 'stops when Captain credits run out, unless the step makes no model call' do
      allow(turn.account).to receive(:usage_limits).and_return({ captain: { responses: { current_available: 0 } } })

      expect { turn.ensure_can_continue! }.to raise_error(Captain::Copilot::LimitExceededError, I18n.t('captain.copilot_limit'))
      expect { turn.ensure_can_continue!(credits: false) }.not_to raise_error
    end

    it 'continues with credits left' do
      allow(turn.account).to receive(:usage_limits).and_return({ captain: { responses: { current_available: 5 } } })

      expect { turn.ensure_can_continue! }.not_to raise_error
    end
  end

  it 'starts every summary with the run id, status and error' do
    expect(turn.summary).to eq(run_id: turn.id, status: 'running', error: nil)
  end

  describe CopilotRun::Turn do
    it 'waits behind an unfinished earlier turn of the same thread' do
      later = start_copilot_turn(account: account, user: user, thread: turn.copilot_thread)

      expect(later).to be_behind_earlier_turn
      turn.release!(:completed)
      expect(later).not_to be_behind_earlier_turn
    end

    it 're-queues a parked turn when its background run finishes, and only a parked one' do
      tool_call = turn.tool_calls.create!(call_id: 'review', name: 'review_conversations', status: :running)

      turn.resume_with(tool_call, { done: true })
      expect(tool_call.reload).to have_attributes(status: 'completed', result: { 'done' => true })
      expect(Captain::Copilot::TurnJob).not_to have_been_enqueued

      turn.update!(status: :awaiting_background_run)
      turn.resume_with(tool_call, { done: true })
      expect(turn.reload).to be_queued
      expect(Captain::Copilot::TurnJob).to have_been_enqueued.with(turn.id)
    end
  end

  describe CopilotRun::Collection do
    it 'summarizes the saved selection' do
      collection = copilot_collection(turn, [3, 1, 2], resource: 'contacts', filters: { 'blocked' => false })

      expect(collection.record_ids(only_matched: true)).to eq([3, 1, 2])
      expect(collection.as_of).to be_within(1.second).of(Time.current)
      expect(collection.summary).to include(resource: 'contacts', filters: { 'blocked' => false }, selected: 3, selection_truncated: false)
    end
  end

  it 'summarizes a tool call' do
    tool_call = turn.tool_calls.create!(call_id: 'x', name: 'display', status: :failed, error: 'boom', arguments: { 'page' => 2 })

    expect(tool_call.summary).to include(name: 'display', status: 'failed', arguments: { 'page' => 2 }, error: 'boom', attempts: 0)
  end
end
