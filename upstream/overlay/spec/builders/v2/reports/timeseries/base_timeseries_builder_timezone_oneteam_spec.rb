# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the report timezone comes from the offset parameter.
RSpec.describe V2::Reports::Timeseries::BaseTimeseriesBuilder do
  it 'derives the timezone name from the offset' do
    builder = described_class.new(create(:account), { timezone_offset: 5.5 })

    expect(ActiveSupport::TimeZone[builder.send(:timezone)].utc_offset).to eq(19_800)
  end
end
