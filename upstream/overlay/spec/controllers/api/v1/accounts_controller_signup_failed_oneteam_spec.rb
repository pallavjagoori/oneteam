require 'rails_helper'

# OneTeam coverage for a signup where the account builder returns nothing:
# the branding enrichment hook fails quietly and the API reports the failure.
RSpec.describe Api::V1::AccountsController, type: :request do
  it 'reports a failed signup and swallows the enrichment error' do
    builder = instance_double(AccountBuilder, perform: [nil, nil])
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(AccountBuilder).to receive(:new).and_return(builder)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)

    with_modified_env ENABLE_ACCOUNT_SIGNUP: 'true' do
      post api_v1_accounts_url, params: { account_name: 'Acme', email: 'new@example.com', password: 'Password1!' }, as: :json
    end

    expect(response).not_to have_http_status(:success)
    expect(tracker).to have_received(:capture_exception)
  end
end
