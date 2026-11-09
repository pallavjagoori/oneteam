require 'rails_helper'

# OneTeam coverage for the label summary report endpoint, which hands the
# request to V2::Reports::LabelSummaryBuilder.
RSpec.describe 'Label summary report (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }

  it 'renders the label summary builder result' do
    builder = instance_double(V2::Reports::LabelSummaryBuilder, build: [{ id: 1, conversations_count: 2 }])
    allow(V2::Reports::LabelSummaryBuilder).to receive(:new).and_return(builder)

    get "/api/v2/accounts/#{account.id}/summary_reports/label",
        params: { since: 1.week.ago.to_i.to_s, until: Time.current.to_i.to_s },
        headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:success)
    expect(response.parsed_body).to eq([{ 'id' => 1, 'conversations_count' => 2 }])
  end
end
