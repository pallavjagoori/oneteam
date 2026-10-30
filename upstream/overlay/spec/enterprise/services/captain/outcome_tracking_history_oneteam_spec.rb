require 'rails_helper'

# OneTeam coverage for when Captain started tracking conversation outcomes
# (the earliest outcome), cached in Redis for 30 days, or for a minute while
# there are no outcomes yet.
RSpec.describe Captain::OutcomeTrackingHistory do
  before { Redis::Alfred.delete(described_class::CACHE_KEY) }

  after { Redis::Alfred.delete(described_class::CACHE_KEY) }

  it 'returns nil, briefly cached, before any outcome exists' do
    expect(described_class.started_at).to be_nil
    expect(Redis::Alfred.ttl(described_class::CACHE_KEY)).to be_between(1, 60)
  end

  it 'returns the earliest outcome time and caches it for 30 days' do
    first = create(:conversation_outcome)
    first.update_column(:created_at, Time.zone.parse('2026-03-01 10:00:00.123456')) # rubocop:disable Rails/SkipsModelValidations
    create(:conversation_outcome)

    expect(described_class.started_at).to eq(Time.zone.parse('2026-03-01 10:00:00.123456'))
    expect(Redis::Alfred.ttl(described_class::CACHE_KEY)).to be > 29.days.to_i
  end

  it 'answers from the cache' do
    Redis::Alfred.set(described_class::CACHE_KEY, '2026-01-01T00:00:00.000000Z'.to_json)

    expect(described_class.started_at).to eq(Time.utc(2026, 1, 1))
  end
end
