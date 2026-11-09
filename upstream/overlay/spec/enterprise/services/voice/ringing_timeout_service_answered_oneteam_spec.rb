require 'rails_helper'

# OneTeam coverage for a timeout attempt on a call that was answered in the
# meantime: only the attempt's mark is cleared.
RSpec.describe Voice::RingingTimeoutService do
  it 'clears the timeout mark when the call stopped ringing' do
    call = instance_double(Call, ringing?: false, ring_state: { 'timing_out_at' => 100, 'ring_recipient_ids' => [1] })
    allow(call).to receive(:with_lock).and_yield
    allow(call).to receive(:update_columns)
    service = described_class.new(call: call)
    allow(service).to receive(:start_timeout) { service.instance_variable_set(:@attempt_at, 100) }

    service.perform

    expect(call).to have_received(:update_columns).with(ring_state: { 'ring_recipient_ids' => [1] })
  end
end
