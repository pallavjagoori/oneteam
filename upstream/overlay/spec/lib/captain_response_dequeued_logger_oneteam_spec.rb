require 'rails_helper'

# OneTeam coverage for the Sidekiq middleware that logs when a Captain
# reply job is picked up from the queue: only Captain response jobs that
# answer a message are logged, and every job still runs.
describe CaptainResponseDequeuedLogger do
  let(:middleware) { described_class.new }

  before { allow(Sidekiq.logger).to receive(:info) }

  def run(job)
    ran = false
    middleware.call(nil, job, 'critical') { ran = true }
    ran
  end

  it 'logs a Captain reply job and runs it' do
    job = { 'wrapped' => described_class::JOB_CLASS, 'jid' => 'jid-1', 'args' => [{ 'job_id' => 'aj-1', 'arguments' => [1, 2, 99] }] }

    expect(run(job)).to be(true)
    expect(Sidekiq.logger).to have_received(:info).with(
      '[CAPTAIN][ResponseLifecycle] event=job_dequeued active_job_id=aj-1 provider_job_id=jid-1 responding_to_message_id=99 queue=critical'
    )
  end

  it 'runs other jobs without logging' do
    expect(run({ 'wrapped' => 'OtherJob', 'args' => [] })).to be(true)
    expect(run({ 'wrapped' => described_class::JOB_CLASS, 'args' => [{ 'arguments' => [1, 2] }] })).to be(true)
    expect(Sidekiq.logger).not_to have_received(:info)
  end
end
