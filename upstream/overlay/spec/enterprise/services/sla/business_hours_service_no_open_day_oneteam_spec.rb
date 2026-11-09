# frozen_string_literal: true

require 'rails_helper'

# OneTeam: with no open day in the coming week, the search stops a week ahead.
RSpec.describe Sla::BusinessHoursService do
  it 'gives up after seven closed days' do
    start = Time.zone.parse('2026-11-09 10:00')
    service = described_class.new(inbox: build(:inbox), start_time: start, threshold_seconds: 60)
    allow(service).to receive(:working_hour_for).and_return(nil)

    expect(service.send(:next_business_day_start, start)).to eq((start + 8.days).beginning_of_day)
  end
end
