require 'rails_helper'

# OneTeam coverage for sign-in when recording the user session fails: the
# failure is logged as a warning and the sign-in still succeeds.
RSpec.describe DeviseOverrides::SessionsController, type: :request do
  it 'signs in and logs a warning when session tracking fails' do
    user = create(:user, password: 'Test@123456')
    tracker = instance_double(UserSessionTrackingService)
    allow(UserSessionTrackingService).to receive(:new).and_return(tracker)
    allow(tracker).to receive(:create_or_update!).and_raise(StandardError, 'redis down')
    allow(Rails.logger).to receive(:warn)

    post '/auth/sign_in', params: { email: user.email, password: 'Test@123456' }, as: :json

    expect(response).to have_http_status(:success)
    expect(Rails.logger).to have_received(:warn).with('Session tracking failed: redis down')
  end
end
