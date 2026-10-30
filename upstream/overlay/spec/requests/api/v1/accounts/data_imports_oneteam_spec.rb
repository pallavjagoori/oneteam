require 'rails_helper'

# OneTeam coverage for the data import endpoints Chatwoot's spec leaves out:
# the import list, invalid source details, a source that cannot be reached
# while creating an import, and retrying a stalled import whose stored
# access key is gone.
RSpec.describe 'Data Imports API (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:headers) { admin.create_new_auth_token }

  before { account.enable_features!('data_import') }

  it 'lists imports newest first' do
    older = create(:data_import, :intercom, account: account, created_at: 2.days.ago)
    newer = create(:data_import, :intercom, account: account, status: :completed)

    get "/api/v1/accounts/#{account.id}/data_imports", headers: headers, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['payload'].pluck('id')).to eq([newer.id, older.id])
  end

  it 'explains invalid source details' do
    allow(DataImports::Freshdesk::CredentialsValidator).to receive(:new).and_raise(ArgumentError, 'Enter a valid Freshdesk domain')

    post "/api/v1/accounts/#{account.id}/data_imports/validate_source",
         params: { source_provider: 'freshdesk', domain: 'nope', access_token: 'key' }, headers: headers, as: :json

    expect(response.parsed_body).to eq('valid' => false, 'message' => 'Enter a valid Freshdesk domain')
  end

  it 'says when the source cannot be reached while creating an import' do
    creation = instance_double(DataImports::CreationService)
    allow(DataImports::CreationService).to receive(:new).and_return(creation)
    allow(creation).to receive(:perform).and_raise(DataImports::Intercom::Client::Error, 'timeout')

    post "/api/v1/accounts/#{account.id}/data_imports",
         params: { source_provider: 'intercom', access_token: 'tok', import_types: %w[contacts] }, headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['message']).to eq('Intercom could not be reached. Please try again.')
  end

  it 'does not retry a stalled import without its access key' do
    data_import = create(:data_import, :intercom, account: account, status: :processing, started_at: 2.hours.ago)
    data_import.update!(access_token: nil, updated_at: 16.minutes.ago)

    post "/api/v1/accounts/#{account.id}/data_imports/#{data_import.id}/retry", headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['message']).to eq('The Intercom access key for this import is unavailable.')
  end
end
