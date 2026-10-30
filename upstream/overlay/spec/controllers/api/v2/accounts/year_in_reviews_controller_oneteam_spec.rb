require 'rails_helper'

# OneTeam coverage for the Year in Review report. It is built once per user,
# account and year, then cached in the user's ui_settings so later visits do
# not recount a year of conversations.
RSpec.describe 'Year in review API', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:url) { "/api/v2/accounts/#{account.id}/year_in_review" }
  let(:report) { { 'year' => 2024, 'total_conversations' => 12 } }
  let(:builder) { instance_double(YearInReviewBuilder, build: report) }

  before { allow(YearInReviewBuilder).to receive(:new).and_return(builder) }

  it 'builds the report for the asked year and caches it' do
    get url, params: { year: 2024 }, headers: agent.create_new_auth_token

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq(report)
    expect(YearInReviewBuilder).to have_received(:new).with(account: account, user_id: agent.id, year: '2024')
    expect(agent.reload.ui_settings["year_in_review_#{account.id}_2024"]).to eq(report)
  end

  it 'defaults to 2025' do
    get url, headers: agent.create_new_auth_token

    expect(YearInReviewBuilder).to have_received(:new).with(account: account, user_id: agent.id, year: 2025)
  end

  it 'serves the cached report without rebuilding it' do
    agent.update!(ui_settings: { "year_in_review_#{account.id}_2024" => { 'year' => 2024, 'cached' => true } })

    get url, params: { year: 2024 }, headers: agent.create_new_auth_token

    expect(response.parsed_body).to eq('year' => 2024, 'cached' => true)
    expect(YearInReviewBuilder).not_to have_received(:new)
  end
end
