require 'rails_helper'

# OneTeam coverage for `rake reporting_events_rollup:backfill`, the console
# wizard that rebuilds an account's daily report rollups from its raw
# reporting events and optionally turns on the faster rollup reports.
RSpec.describe 'reporting_events_rollup:backfill' do # rubocop:disable RSpec/DescribeClass
  let(:account) { create(:account, reporting_timezone: 'UTC') }

  before do
    travel_to Time.zone.parse('2026-03-10 12:00 UTC')
    create(:reporting_event, account: account, name: 'first_response', value: 60, created_at: Time.zone.parse('2026-03-07 10:00 UTC'))
    create(:reporting_event, account: account, name: 'first_response', value: 30, created_at: Time.zone.parse('2026-03-08 10:00 UTC'))
    allow(ReportingEvents::BackfillService).to receive(:backfill_date)
  end

  it 'needs an account id' do
    result = run_rake('reporting_events_rollup:backfill', input: "\n")

    expect(result.output).to include('Account ID is required')
    expect(result.status).to eq(1)
  end

  it 'needs an existing account' do
    expect(run_rake('reporting_events_rollup:backfill', input: "0\n").output).to include('Account with ID 0 not found')
  end

  it 'needs a reporting timezone' do
    account.update!(reporting_timezone: nil)

    expect(run_rake('reporting_events_rollup:backfill', input: "#{account.id}\n").output).to include('must have reporting_timezone set')
  end

  it 'rejects an invalid reporting timezone' do
    account.update_column(:settings, { 'reporting_timezone' => 'Mars/Base' }) # rubocop:disable Rails/SkipsModelValidations

    expect(run_rake('reporting_events_rollup:backfill', input: "#{account.id}\n").output).to include("invalid reporting_timezone 'Mars/Base'")
  end

  it 'stops when the account has no events' do
    result = run_rake('reporting_events_rollup:backfill', input: "#{create(:account, reporting_timezone: 'UTC').id}\n")

    expect(result.output).to include('Nothing to backfill.')
    expect(result.status).to eq(0)
  end

  it 'stops when only today has events' do
    other = create(:account, reporting_timezone: 'UTC')
    create(:reporting_event, account: other, name: 'first_response', created_at: Time.current)

    expect(run_rake('reporting_events_rollup:backfill', input: "#{other.id}\n").output).to include('No closed days available')
  end

  it 'shows the plan without writing anything on a dry run' do
    result = run_rake('reporting_events_rollup:backfill', input: "#{account.id}\ny\n")

    expect(result.output).to include('DRY RUN MODE: Would process 2 days', 'Date Range:  2026-03-07 to 2026-03-08')
    expect(ReportingEvents::BackfillService).not_to have_received(:backfill_date)
  end

  it 'can be cancelled at the confirmation' do
    expect(run_rake('reporting_events_rollup:backfill', input: "#{account.id}\nn\nn\n").output).to include('Backfill cancelled')
  end

  it 'backfills each closed day and turns on rollup reports when asked' do
    result = run_rake('reporting_events_rollup:backfill', input: "#{account.id}\nn\nyes\ny\n", tty: true)

    expect(ReportingEvents::BackfillService).to have_received(:backfill_date).exactly(2).times
    expect(result.output).to include('BACKFILL COMPLETE', "Enabled report_rollup for account #{account.id}")
    expect(account.reload.feature_enabled?('report_rollup')).to be(true)
  end

  it 'leaves rollup reports off unless asked' do
    run_rake('reporting_events_rollup:backfill', input: "#{account.id}\nn\ny\nn\n")

    expect(account.reload.feature_enabled?('report_rollup')).to be(false)
  end

  it 'says when rollup reports are already on' do
    account.enable_features!('report_rollup')

    expect(run_rake('reporting_events_rollup:backfill', input: "#{account.id}\nn\ny\n").output).to include('already enabled')
  end

  it 'warns about backfills longer than two years' do
    create(:reporting_event, account: account, name: 'first_response', created_at: Time.zone.parse('2023-01-01 10:00 UTC'))

    expect(run_rake('reporting_events_rollup:backfill', input: "#{account.id}\nn\nn\n").output).to include('WARNING: Large backfill detected')
  end

  it 'reports a failure with progress' do
    allow(ReportingEvents::BackfillService).to receive(:backfill_date).and_raise(StandardError, 'db down')

    result = run_rake('reporting_events_rollup:backfill', input: "#{account.id}\nn\ny\n")

    expect(result.output).to include('BACKFILL FAILED', 'Error: StandardError - db down', 'Processed: 0/2 days (0.0%)')
    expect(result.status).to eq(1)
  end
end
