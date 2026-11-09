# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an unparseable stored timestamp reads as missing.
RSpec.describe Conversations::UnreadCounts::FilteredCountStore do
  it 'returns nil for a malformed time' do
    expect(described_class.send(:parse_time, '2024-13-45')).to be_nil
  end
end
