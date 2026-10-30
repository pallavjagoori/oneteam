require 'rails_helper'

# OneTeam coverage for the `download_report:*` console tasks, which ask for an
# account and date range and save the agent, inbox or label summary report as
# a CSV file in the current directory.
RSpec.describe 'download_report tasks' do # rubocop:disable RSpec/DescribeClass
  let(:account) { create(:account) }
  let(:answers) { "#{account.id}\n2026-01-01\n2026-01-31\n5.5\ny\n" }

  around do |example|
    Dir.mktmpdir { |dir| Dir.chdir(dir) { example.run } }
  end

  before do
    create(:user, account: account, name: 'Ada')
    create(:inbox, account: account, name: 'Support')
    create(:label, account: account, title: 'billing')
  end

  {
    'download_report:agent' => %w[agent Ada],
    'download_report:inbox' => %w[inbox Support],
    'download_report:label' => %w[label billing]
  }.each do |task, (type, name)|
    it "saves the #{type} report as CSV" do
      result = run_rake(task, input: answers)
      filename = "#{account.id}_#{type}_2026-01-01_2026-01-31.csv"

      expect(result.output).to include("Report saved to: #{filename}")
      expect(File.read(filename)).to include('conversations_count', name)
    end
  end

  it 'uses UTC and calendar hours when those answers are left blank' do
    expect(run_rake('download_report:label', input: "#{account.id}\n2026-01-01\n2026-01-31\n\n\n").output).to include('Report saved')
  end

  it 'formats times to two decimals and leaves empty times blank' do
    expect(DownloadReportTasks.format_time(12.345)).to eq(12.35)
    expect(DownloadReportTasks.format_time(0)).to eq('')
    expect(DownloadReportTasks.format_time(nil)).to eq('')
  end

  {
    "\n" => 'Account ID is required',
    "0\n" => "Account with ID '0' not found",
    "ACCOUNT\n\n" => 'Start date is required',
    "ACCOUNT\n2026-01-01\n\n" => 'End date is required',
    "ACCOUNT\n2026-01-01\n2026-01-31\n99\nn\n" => "Invalid timezone offset '99.0'",
    "ACCOUNT\n2026-13-45\n2026-01-31\n0\nn\n" => 'Error parsing dates'
  }.each do |input, error|
    it "stops with '#{error}'" do
      result = run_rake('download_report:agent', input: input.sub('ACCOUNT', account.id.to_s))

      expect(result.output).to include(error)
      expect(result.status).to eq(1)
    end
  end
end
