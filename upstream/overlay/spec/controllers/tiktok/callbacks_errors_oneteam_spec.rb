require 'rails_helper'

# OneTeam coverage for TikTok sign-in callbacks that fail: the account has no
# inbox slots left, or TikTok's token endpoint errors. Both send the user back
# to the new-inbox page with the error details.
RSpec.describe 'TikTok callback errors', type: :request do
  let(:account) { create(:account) }
  let(:state) { JWT.encode({ sub: account.id, iat: Time.current.to_i }, 'tiktok-app-secret', 'HS256') }

  def call_back
    with_modified_env TIKTOK_APP_ID: 'tiktok-app-id', TIKTOK_APP_SECRET: 'tiktok-app-secret' do
      get '/tiktok/callback', params: { code: 'valid_code', state: state }
    end
  end

  before do
    InstallationConfig.where(name: %w[TIKTOK_APP_ID TIKTOK_APP_SECRET]).delete_all
    GlobalConfig.clear_cache
  end

  it 'reports an inbox limit with its HTTP status' do
    allow(Tiktok::AuthClient).to receive(:obtain_short_term_access_token)
      .and_raise(CustomExceptions::Inbox::LimitExceeded.new({}))

    call_back

    expect(response).to redirect_to(%r{/inboxes/new/tiktok\?.*error_type=CustomExceptions%3A%3AInbox%3A%3ALimitExceeded})
    expect(response.location).to include('code=402')
  end

  it 'logs and reports unexpected errors as a 500' do
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
    allow(Tiktok::AuthClient).to receive(:obtain_short_term_access_token).and_raise(StandardError, 'token endpoint down')

    call_back

    expect(response.location).to include('code=500', 'error_message=token+endpoint+down')
    expect(tracker).to have_received(:capture_exception)
  end
end
