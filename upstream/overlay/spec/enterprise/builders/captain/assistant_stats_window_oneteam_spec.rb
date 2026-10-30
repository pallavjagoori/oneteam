require 'rails_helper'

# OneTeam coverage for the calendar-week ranges of the Captain Overview
# report: weeks start on Sunday, "this week" is compared with the same part
# of last week, and "last week" with the whole week before it.
RSpec.describe Captain::AssistantStatsWindow do
  # Wednesday 2026-10-28, 15:00 UTC
  around { |example| travel_to(Time.zone.parse('2026-10-28 15:00:00')) { example.run } }

  it 'covers this week so far and the same stretch of last week' do
    window = described_class.new('this_week')

    expect(window.current).to eq(Time.zone.parse('2026-10-25 00:00')..Time.current)
    expect(window.previous).to eq(Time.zone.parse('2026-10-18 00:00')..(1.week.ago))
  end

  it 'covers the whole of last week and the week before' do
    window = described_class.new('last_week')

    expect(window.current).to eq(Time.zone.parse('2026-10-18 00:00')..Time.zone.parse('2026-10-24').end_of_day)
    expect(window.previous).to eq(Time.zone.parse('2026-10-11 00:00')..Time.zone.parse('2026-10-17').end_of_day)
  end
end
