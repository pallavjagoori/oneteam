require 'rails_helper'

RSpec.describe Integrations::Dyte::ProcessorService do
  it 'logs instead of raising when the participant id cannot be stored' do
    message = create(:message)
    allow(message).to receive(:update_columns).and_raise(ActiveRecord::StatementInvalid, 'locked')
    allow(Rails.logger).to receive(:warn)

    described_class.allocate.send(:update_realtimekit_participant_id, message, 'client-1', 'participant-1')

    expect(Rails.logger).to have_received(:warn).with(/Failed to store RealtimeKit participant ID for message #{message.id}/)
  end
end
