# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the Messenger parser exposes the timestamp and sequence number.
RSpec.describe Integrations::Facebook::MessageParser do
  it 'reads the timestamp and sequence' do
    parser = described_class.new({ messaging: { timestamp: 1_700_000_000, message: { seq: 42 } } }.to_json)

    expect(parser.time_stamp).to eq(1_700_000_000)
    expect(parser.sequence).to eq(42)
  end
end
