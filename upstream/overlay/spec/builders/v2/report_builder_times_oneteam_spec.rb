require 'rails_helper'

# OneTeam coverage for the report time metrics Chatwoot's spec leaves out:
# reply time and resolution time per day for an inbox or team, in plain or
# business hours, and the summary averages (zero when there is no data).
describe V2::ReportBuilder do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:team) { create(:team, account: account) }
  let(:range) { { since: 1.day.ago.to_i.to_s, until: 1.day.from_now.to_i.to_s } }

  before do
    conversation = create(:conversation, account: account, inbox: inbox, team: team)
    { 'reply_time' => [10, 4], 'conversation_resolved' => [100, 40], 'first_response' => [20, 8] }.each do |name, (value, business)|
      create(:reporting_event, account: account, inbox: inbox, conversation: conversation, name: name, value: value,
                               value_in_business_hours: business)
    end
  end

  def report(**params)
    described_class.new(account, { type: :inbox, id: inbox.id, group_by: 'day' }.merge(range).merge(params))
  end

  it 'charts reply and resolution time per day' do
    expect(report(metric: 'reply_time').timeseries[Time.zone.today]).to eq(10)
    expect(report(metric: 'avg_resolution_time').timeseries[Time.zone.today]).to eq(100)
    expect(report(metric: 'reply_time', business_hours: true).timeseries[Time.zone.today]).to eq(4)
    expect(report(metric: 'avg_resolution_time', business_hours: true).timeseries[Time.zone.today]).to eq(40)
  end

  it 'reports a team' do
    expect(report(type: :team, id: team.id, metric: 'reply_time').timeseries[Time.zone.today]).to eq(10)
  end

  it 'averages times in business hours for the summary' do
    expect(report(business_hours: true).summary).to include(avg_resolution_time: 40, reply_time: 4, avg_first_response_time: 8)
  end

  it 'reports zero times when nothing happened in the range' do
    old = { since: 10.days.ago.to_i.to_s, until: 9.days.ago.to_i.to_s }

    expect(report(**old).summary).to include(avg_resolution_time: 0, reply_time: 0, avg_first_response_time: 0)
  end
end
