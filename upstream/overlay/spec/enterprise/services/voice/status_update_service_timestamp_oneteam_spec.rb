# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an unparseable provider timestamp is ignored.
RSpec.describe Voice::StatusUpdateService do
  it 'returns nil for a malformed timestamp' do
    service = described_class.new(account: build(:account), call_sid: 'CA1', payload: { 'Timestamp' => '2026-13-45 99:99' })

    expect(service.send(:payload_timestamp)).to be_nil
  end
end
