require 'rails_helper'

# OneTeam coverage for the CSV report downloads with real rows: one row per
# team, one per label, and the account-wide conversation summary.
RSpec.describe 'Report CSV rows', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:params) { { since: 30.days.ago.to_i.to_s, until: Time.current.end_of_day.to_i.to_s } }

  def download(report)
    get "/api/v2/accounts/#{account.id}/reports/#{report}.csv", params: params, headers: admin.create_new_auth_token
    expect(response).to have_http_status(:success)
    response.body
  end

  it 'lists each team' do
    create(:team, account: account, name: 'payments')

    expect(download('teams')).to include('payments')
  end

  it 'lists each label' do
    create(:label, account: account, title: 'billing')

    expect(download('labels')).to include('billing')
  end

  it 'summarises conversations for the account' do
    create(:conversation, account: account)

    expect(download('conversations_summary').lines.size).to be >= 2
  end
end
