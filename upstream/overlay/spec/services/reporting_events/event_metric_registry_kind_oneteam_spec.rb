# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an unknown metric payload kind is a programming error.
RSpec.describe ReportingEvents::EventMetricRegistry do
  it 'raises on an unknown payload kind' do
    expect { described_class.send(:metric_values, :ratio, {}) }.to raise_error(ArgumentError, 'Unknown metric payload kind: :ratio')
  end
end
