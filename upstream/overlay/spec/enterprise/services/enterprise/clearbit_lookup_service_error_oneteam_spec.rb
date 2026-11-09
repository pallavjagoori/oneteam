require 'rails_helper'

# OneTeam coverage for Clearbit lookups that fail: the error is logged and
# no data is returned.
RSpec.describe Enterprise::ClearbitLookupService do
  it 'returns nil when the request fails' do
    allow(described_class).to receive_messages(clearbit_enabled?: true)
    allow(described_class).to receive(:perform_request).and_raise(StandardError, 'timeout')
    allow(Rails.logger).to receive(:error)

    expect(described_class.lookup('a@example.com')).to be_nil
    expect(Rails.logger).to have_received(:error).with('[ClearbitLookup] timeout')
  end
end
