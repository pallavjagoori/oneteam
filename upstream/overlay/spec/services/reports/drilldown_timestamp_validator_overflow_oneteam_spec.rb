require 'rails_helper'

RSpec.describe Reports::DrilldownTimestampValidator do
  it 'treats timestamps that cannot become times as outside the range' do
    allow(Time.zone).to receive(:at).and_raise(RangeError)

    expect(described_class.bucket_overlaps_requested_range?({}, { bucket_timestamp: 1, since: 0, until: 2 })).to be(false)
  end
end
