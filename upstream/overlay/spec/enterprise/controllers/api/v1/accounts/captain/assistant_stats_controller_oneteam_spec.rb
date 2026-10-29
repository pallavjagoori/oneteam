require 'rails_helper'

# OneTeam coverage for the Captain assistant Overview report API: the stat
# cards, the resolution flow and trend, an AI-written summary of standout
# points (cached for an hour), and drilldowns that list the conversations
# behind each stat card.
RSpec.describe 'Captain assistant stats API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:assistant) { create(:captain_assistant, account: account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/captain/assistants/#{assistant.id}/stats" }
  let(:headers) { admin.create_new_auth_token }

  before { allow(Captain::OutcomeTrackingHistory).to receive(:started_at).and_return(Time.zone.parse('2026-01-01 00:00:00')) }

  def outcome(started_at, **attributes)
    create(:conversation_outcome, account: account, assistant: assistant, inbox: inbox, started_at: started_at, **attributes)
  end

  describe 'report endpoints' do
    it 'returns the overview with the tracking start date' do
      get "#{base_url}/overview", params: { range: '30' }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include('conversations_handled', 'tracking_started_at' => '2026-01-01T00:00:00.000000Z')
    end

    it 'returns the resolution flow' do
      get "#{base_url}/resolution_flow", params: { range: '30' }, headers: headers

      expect(response.parsed_body.keys).to contain_exactly('sankey', 'handoff_distribution')
    end

    it 'returns the resolution trend' do
      get "#{base_url}/resolution_trend", params: { range: '7' }, headers: headers

      expect(response).to have_http_status(:ok)
    end

    it 'returns 404 for an assistant in another account' do
      other = create(:captain_assistant)

      get "/api/v1/accounts/#{account.id}/captain/assistants/#{other.id}/stats/overview", headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'GET overview_summary' do
    let(:summary_service) { instance_double(Captain::AssistantOverviewSummaryService, perform: { points: ['Handoffs fell by half.'] }) }

    before { allow(Captain::AssistantOverviewSummaryService).to receive(:new).and_return(summary_service) }

    it 'generates the summary once and then serves it from the cache' do
      2.times { get "#{base_url}/overview_summary", params: { range: '30', timezone_offset: '5.5' }, headers: headers }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq('points' => ['Handoffs fell by half.'])
      expect(summary_service).to have_received(:perform).once
      expect(Captain::AssistantOverviewSummaryService).to have_received(:new)
        .with(account: account, assistant: assistant, range: '30', timezone_offset: '5.5')
    end

    it 'returns an LLM error as 422 without caching it' do
      allow(summary_service).to receive(:perform).and_return({ error: 'API key missing' })

      2.times { get "#{base_url}/overview_summary", headers: headers }

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body).to eq('error' => 'API key missing')
      expect(summary_service).to have_received(:perform).twice
    end

    it 'rejects an invalid timezone offset' do
      get "#{base_url}/overview_summary", params: { timezone_offset: 'mars' }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'GET drilldown' do
    let(:now) { Time.current.change(usec: 0) }
    let!(:auto) { outcome(now - 10.days, first_captain_reply_at: now - 10.days + 1.minute, resolved_at: now - 10.days + 1.hour) }
    let!(:reopened) do
      outcome(now - 20.days, first_captain_reply_at: now - 20.days + 1.minute, resolved_at: now - 20.days + 1.hour,
                             ended_at: now - 18.days)
    end
    let!(:handoff) do
      outcome(now - 5.days, first_captain_reply_at: now - 5.days + 1.minute, handoff_at: now - 5.days + 5.minutes,
                            handoff_reason_category: 'customer_request')
    end
    # Referenced by name from the metric table below, which RSpec/LetSetup cannot see.
    let!(:unclassified) { outcome(now - 4.days, handoff_at: now - 4.days + 5.minutes) } # rubocop:disable RSpec/LetSetup
    let!(:with_team) do # rubocop:disable RSpec/LetSetup
      outcome(now - 3.days, first_captain_reply_at: now - 3.days + 1.minute, first_human_reply_at: now - 3.days + 2.minutes,
                            resolved_at: now - 3.days + 1.hour)
    end

    before do
      outcome(now - 60.days, first_captain_reply_at: now - 60.days)
      create(:conversation_outcome, account: account, started_at: now - 2.days, first_captain_reply_at: now - 2.days)
    end

    def drilldown(**params)
      get "#{base_url}/drilldown", params: { range: '30' }.merge(params), headers: headers
      response.parsed_body
    end

    def episode_ids(**params)
      drilldown(**params)['payload'].pluck('episode_id')
    end

    {
      { metric: 'conversations_handled' } => %i[with_team unclassified handoff auto reopened],
      { metric: 'auto_resolution_rate' } => %i[auto reopened],
      { metric: 'handoff_rate' } => %i[unclassified handoff],
      { metric: 'reopen_rate' } => %i[reopened],
      { metric: 'durable_resolution_rate' } => %i[auto],
      { metric: 'closed_with_team' } => %i[with_team],
      { metric: 'reopened_within_7_days' } => %i[reopened],
      { metric: 'stayed_closed' } => %i[auto],
      { metric: 'handoff_reason', reason: 'customer_request' } => %i[handoff],
      { metric: 'handoff_reason', reason: 'unclassified' } => %i[unclassified]
    }.each do |params, expected|
      it "lists the conversations behind #{params.values.join(' ')}, newest first" do
        expect(episode_ids(**params)).to eq(expected.map { |name| public_send(name).id })
      end
    end

    it 'includes the conversation and when the episode started' do
      row = drilldown(metric: 'reopen_rate')['payload'].first

      expect(row).to include('record_type' => 'conversation', 'episode_started_at' => reopened.started_at.to_i)
      expect(row['conversation']).to include('id' => reopened.conversation.id, 'display_id' => reopened.conversation.display_id)
    end

    it 'paginates, with 25 per page by default and at most 100' do
      body = drilldown(metric: 'conversations_handled', page: 2, per_page: 2)
      expect(body['meta']).to eq('total_count' => 5, 'current_page' => 2, 'per_page' => 2)
      expect(body['payload'].pluck('episode_id')).to eq([handoff.id, auto.id])

      expect(drilldown(metric: 'conversations_handled', per_page: 0)['meta']).to include('current_page' => 1, 'per_page' => 25)
      expect(drilldown(metric: 'conversations_handled', per_page: 500)['meta']['per_page']).to eq(100)
    end

    it 'rejects an unknown metric or handoff reason' do
      get "#{base_url}/drilldown", params: { metric: 'csat' }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)

      get "#{base_url}/drilldown", params: { metric: 'handoff_reason', reason: 'bored' }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'is admin only' do
      agent = create(:user, account: account, role: :agent)

      get "#{base_url}/drilldown", params: { metric: 'handoff_rate' }, headers: agent.create_new_auth_token

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
