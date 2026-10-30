require 'rails_helper'

# OneTeam coverage for super admin pages Chatwoot's specs leave out: the
# dashboard's JSON stats (counts, a 30-day conversation chart, and the
# conversation count from Postgres' estimate or an exact count before the
# table is analysed), refreshing the instance status, and platform banners,
# which exist only on Chatwoot Cloud.
RSpec.describe 'Super Admin dashboard and settings', type: :request do
  let(:super_admin) { create(:super_admin) }

  before do
    sign_in(super_admin, scope: :super_admin)
    Rails.cache.delete('super_admin:dashboard_stats')
  end

  it 'returns dashboard stats as JSON' do
    create(:conversation)
    allow(ActiveRecord::Base.connection).to receive(:select_value).and_call_original
    allow(ActiveRecord::Base.connection).to receive(:select_value).with(/reltuples/).and_return('-1')

    get '/super_admin', as: :json

    expect(response.parsed_body).to include('accountsCount' => Account.count.to_s, 'conversationsCount' => '1')
    expect(response.parsed_body['chartData'].size).to be >= 30
  end

  it 'uses the planner estimate once the table has been analysed' do
    allow(ActiveRecord::Base.connection).to receive(:select_value).and_call_original
    allow(ActiveRecord::Base.connection).to receive(:select_value).with(/reltuples/).and_return('12345')

    get '/super_admin', as: :json

    expect(response.parsed_body['conversationsCount']).to eq('12,345')
  end

  it 'refreshes the instance status' do
    expect(Internal::CheckNewVersionsJob).to receive(:perform_now)

    get '/super_admin/settings/refresh'

    expect(response).to redirect_to('/super_admin/settings')
    expect(flash[:notice]).to eq('Instance status refreshed')
  end

  it 'shows the settings page' do
    get '/super_admin/settings'

    expect(response).to have_http_status(:ok)
  end

  it 'hides platform banners outside Chatwoot Cloud' do
    allow(ChatwootApp).to receive(:chatwoot_cloud?).and_return(false)

    get '/super_admin/platform_banners'

    expect(response).to have_http_status(:not_found)
  end

  it 'lists platform banners on Chatwoot Cloud' do
    allow(ChatwootApp).to receive(:chatwoot_cloud?).and_return(true)

    get '/super_admin/platform_banners'

    expect(response).to have_http_status(:ok)
  end
end
