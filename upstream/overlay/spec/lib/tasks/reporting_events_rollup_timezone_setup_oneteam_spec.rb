require 'rails_helper'

# OneTeam coverage for `rake reporting_events_rollup:set_timezone`, the
# console wizard that picks an account's reporting timezone from a UTC offset
# and says when the rollup backfill can first run.
RSpec.describe 'reporting_events_rollup:set_timezone' do # rubocop:disable RSpec/DescribeClass
  let(:account) { create(:account) }

  def set_timezone(input, tty: false)
    run_rake('reporting_events_rollup:set_timezone', input: input, tty: tty)
  end

  it 'saves the chosen timezone and shows when to run the backfill' do
    result = set_timezone("#{account.id}\n+5:30\n1\ny\n", tty: true)

    expect(account.reload.reporting_timezone).to eq('Asia/Kolkata')
    expect(result.output).to include("Updated reporting_timezone for account '#{account.name}' to 'Asia/Kolkata'",
                                     'bundle exec rake reporting_events_rollup:backfill')
  end

  it 'lets the user go back and enter another offset' do
    set_timezone("#{account.id}\n0\n0\n-8\n1\nyes\n")

    expect(ActiveSupport::TimeZone[account.reload.reporting_timezone].utc_offset).to eq(-8.hours)
  end

  it 'needs an account id' do
    expect(set_timezone("\n").output).to include('Account ID is required')
  end

  it 'needs an existing account' do
    expect(set_timezone("0\n").output).to include('Account with ID 0 not found')
  end

  it 'needs an offset' do
    expect(set_timezone("#{account.id}\n\n").output).to include('UTC offset is required')
  end

  it 'rejects offsets that are malformed, out of range or match no timezone' do
    %w[abc +15 -13 +5:75 +2:15].each do |offset|
      expect(set_timezone("#{account.id}\n#{offset}\n").output).to include("No timezones found for offset '#{offset}'")
    end
  end

  it 'rejects a selection outside the list' do
    expect(set_timezone("#{account.id}\n0\n99\n").output).to include('Invalid selection')
  end

  it 'can be cancelled at the confirmation' do
    result = set_timezone("#{account.id}\n0\n1\nn\n")

    expect(result.output).to include('Timezone setup cancelled')
    expect(account.reload.reporting_timezone).to be_nil
  end
end
