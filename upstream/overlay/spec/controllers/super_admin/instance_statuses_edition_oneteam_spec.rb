require 'rails_helper'

# OneTeam coverage for the super admin instance status page on community and
# custom builds, and when Postgres or Redis are not reachable.
RSpec.describe 'Super Admin instance status edge cases', type: :request do
  let(:super_admin) { create(:super_admin) }

  before do
    sign_in(super_admin, scope: :super_admin)
    allow(ChatwootApp).to receive(:enterprise?).and_return(false)
  end

  it 'shows a custom build' do
    allow(ChatwootApp).to receive(:custom?).and_return(true)

    get '/super_admin/instance_status'

    expect(response.body).to include('Custom')
  end

  it 'shows a community build with services down' do
    allow(ChatwootApp).to receive(:custom?).and_return(false)
    allow(ActiveRecord::Base.connection).to receive(:active?).and_return(false)
    allow(Redis).to receive(:new).and_raise(Redis::CannotConnectError)

    get '/super_admin/instance_status'

    expect(response.body).to include('Community')
    expect(response).to have_http_status(:success)
  end
end
