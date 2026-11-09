require 'rails_helper'

# OneTeam coverage for Captain lifecycle logs: skipped jobs and responses
# discarded because a newer customer message arrived.
RSpec.describe Captain::Conversation::ResponseLifecycleLogging do
  let(:host) { Class.new { include Captain::Conversation::ResponseLifecycleLogging }.new }

  before do
    host.instance_variable_set(:@conversation, Struct.new(:id).new(12))
    allow(Rails.logger).to receive(:info)
  end

  it 'stays quiet for jobs without a message to answer' do
    host.send(:log_non_pending)

    expect(Rails.logger).not_to have_received(:info)
  end

  it 'logs skipped jobs and discarded responses' do
    host.instance_variable_set(:@responding_to_message_id, 99)

    host.send(:log_non_pending)
    host.send(:log_pre_generation_discard)

    expect(Rails.logger).to have_received(:info).with(/event=job_skipped reason=conversation_not_pending conversation_id=12/)
    expect(Rails.logger).to have_received(:info).with(/event=response_discarded reason=newer_customer_message_before_generation/)
  end
end
