require 'rails_helper'

# OneTeam coverage for the job that answers an agent's Copilot message.
# Turns of a thread run in order; a failed turn is retried twice, except for
# expected stops (workflows off, no credits) and invalid input, which end it
# with a message in the thread.
RSpec.describe Captain::Copilot::TurnJob do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:turn) { start_copilot_turn(account: account, user: admin).tap { |run| run.release!(:queued) } }
  let(:service) { instance_double(Captain::Copilot::TurnService, generate_response: true) }

  before { allow(Captain::Copilot::TurnService).to receive(:new).and_return(service) }

  it 'answers the turn under its lease' do
    described_class.perform_now(turn.id)

    expect(Captain::Copilot::TurnService).to have_received(:new).with(turn, turn.reload.lease_token)
    expect(service).to have_received(:generate_response)
  end

  it 'waits for an earlier turn of the thread' do
    later = start_copilot_turn(account: account, user: admin, thread: turn.copilot_thread).tap { |run| run.release!(:queued) }

    expect { described_class.perform_now(later.id) }.to have_enqueued_job(described_class).with(later.id)
    expect(service).not_to have_received(:generate_response)
  end

  it 'retries an unexpected error twice, then tells the agent' do
    allow(service).to receive(:generate_response).and_raise(RuntimeError)

    described_class.perform_now(turn.id)
    expect(turn.reload).to have_attributes(status: 'queued', attempts: 1, error: 'RuntimeError')

    2.times { described_class.perform_now(turn.id) }
    expect(turn.reload).to be_failed
    expect(turn.copilot_thread.copilot_messages.last.message['content']).to eq('I could not finish this request. Completed steps were saved.')
  end

  it 'ends at once with the reason when workflows stop' do
    allow(service).to receive(:generate_response).and_raise(Captain::Copilot::LimitExceededError, 'Out of credits')

    described_class.perform_now(turn.id)

    expect(turn.reload).to be_failed
    expect(turn.copilot_thread.copilot_messages.last.message).to include('run_id' => turn.id, 'content' => 'Out of credits')
  end

  it 'ends at once on invalid input' do
    allow(service).to receive(:generate_response).and_raise(ArgumentError, 'bad')

    described_class.perform_now(turn.id)

    expect(turn.reload).to have_attributes(status: 'failed', attempts: 1)
  end

  it 'ignores a lost lease and finished turns' do
    allow(service).to receive(:generate_response).and_raise(Captain::Copilot::LeaseLostError)

    expect { described_class.perform_now(turn.id) }.not_to raise_error

    turn.update!(status: :completed)
    described_class.perform_now(turn.id)
    expect(service).to have_received(:generate_response).once
  end

  it 'stops quietly when the lease is lost while recording a failure' do
    allow(service).to receive(:generate_response).and_raise(RuntimeError)
    allow_any_instance_of(CopilotRun::Turn).to receive(:with_lease).and_raise(Captain::Copilot::LeaseLostError) # rubocop:disable RSpec/AnyInstance

    expect { described_class.perform_now(turn.id) }.not_to raise_error
    expect(turn.reload.attempts).to eq(0)
  end

  it 'does nothing while another worker holds the turn' do
    turn.claim

    described_class.perform_now(turn.id)

    expect(service).not_to have_received(:generate_response)
  end

  it 'counts taking over an expired lease as a failed attempt' do
    turn.claim
    turn.update!(lease_until: 1.second.ago)

    described_class.perform_now(turn.id)

    expect(turn.reload).to have_attributes(status: 'queued', error: 'Captain::Copilot::LeaseExpiredError')
  end
end
