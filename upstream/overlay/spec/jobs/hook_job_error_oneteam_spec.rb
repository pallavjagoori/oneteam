require 'rails_helper'

# OneTeam coverage: an integration processor that fails inside HookJob is
# logged and does not fail the job.
RSpec.describe HookJob do
  it 'logs a failing integration processor' do
    hook = create(:integrations_hook, app_id: 'slack')
    allow(SendOnSlackJob).to receive(:perform_later).and_raise(StandardError, 'queue down')
    allow(Rails.logger).to receive(:error)
    message = create(:message)

    expect { described_class.perform_now(hook, 'message.created', message: message) }.not_to raise_error
    expect(Rails.logger).to have_received(:error).with(an_instance_of(StandardError))
  end
end
