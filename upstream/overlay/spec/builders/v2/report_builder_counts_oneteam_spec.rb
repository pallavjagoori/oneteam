require 'rails_helper'

# OneTeam coverage for the legacy report format of average metrics, which
# carries the number of values behind each average.
describe V2::ReportBuilder do
  it 'adds the count to average metric points' do
    time = Time.utc(2026, 1, 1)
    builder = described_class.new(create(:account), { metric: 'avg_first_response_time' })
    allow(builder).to receive(:timeseries).and_return([[time, 30.0]])
    builder.instance_variable_set(:@grouped_values, instance_double(ActiveRecord::Relation, count: { time => 3 }))

    expect(builder.build).to eq([{ value: 30.0, timestamp: time.to_i, count: 3 }])
  end
end
