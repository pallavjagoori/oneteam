# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a data source knows whether its metric counts and which rollup it uses.
RSpec.describe Reports::DataSource do
  it 'reads the count flag and rollup metric from the registry entry' do
    metric = Reports::ReportMetricRegistry.fetch('conversations_count')
    source = described_class.allocate
    allow(source).to receive(:report_metric).and_return(metric)

    expect(source.send(:count_metric?)).to eq(!metric.average?)
    expect(source.send(:rollup_metric)).to eq(metric.rollup_metric)
  end
end
