require 'rails_helper'

# OneTeam coverage for the super admin logout link.
RSpec.describe 'Super admin logout (OneTeam)', type: :request do
  it 'signs the super admin out and goes home' do
    sign_in(create(:super_admin), scope: :super_admin)

    get '/super_admin/logout'

    expect(response).to redirect_to('/')
  end
end
