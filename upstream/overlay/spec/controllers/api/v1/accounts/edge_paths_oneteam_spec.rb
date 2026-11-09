require 'rails_helper'

# OneTeam coverage for small account API branches that Chatwoot's specs skip:
# rotating an agent bot's webhook secret, an assignment request that names
# neither an agent nor a team, a custom filter whose payload is not a list,
# a search the service rejects, an unexpected upload failure and a blank
# company contact search.
RSpec.describe 'Account API edge paths (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:headers) { admin.create_new_auth_token }
  let(:base) { "/api/v1/accounts/#{account.id}" }

  it 'rotates an agent bot webhook secret' do
    bot = create(:agent_bot, account: account)
    old_secret = bot.secret

    post "#{base}/agent_bots/#{bot.id}/reset_secret", headers: headers, as: :json

    expect(response).to have_http_status(:success)
    expect(bot.reload.secret).not_to eq(old_secret)
    expect(response.parsed_body['secret']).to eq(bot.secret)
  end

  it 'answers null when an assignment names neither an agent nor a team' do
    conversation = create(:conversation, account: account)
    create(:inbox_member, inbox: conversation.inbox, user: admin)

    post "#{base}/conversations/#{conversation.display_id}/assignments", params: {}, headers: headers, as: :json

    expect(response).to have_http_status(:success)
    expect(response.body).to eq('null')
  end

  it 'rejects a custom filter whose query payload is not a list' do
    post "#{base}/custom_filters",
         params: { custom_filter: { name: 'Odd', type: 'conversation', query: { payload: 'nope' } } },
         headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
  end

  it 'returns 422 when the search service rejects the query' do
    search = instance_double(SearchService)
    allow(SearchService).to receive(:new).and_return(search)
    allow(search).to receive(:perform).and_raise(ArgumentError, 'bad search')

    get "#{base}/search/conversations", params: { q: 'x' }, headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq('bad search')
  end

  it 'returns 500 when an upload from a URL fails unexpectedly' do
    allow(SafeFetch).to receive(:fetch).and_raise(RuntimeError, 'boom')

    post "#{base}/upload", params: { external_url: 'https://example.com/a.png' }, headers: headers, as: :json

    expect(response).to have_http_status(:internal_server_error)
  end

  it 'asks for a search string on a blank company contact search' do
    account.enable_features!(:companies)
    company = create(:company, account: account)

    get "#{base}/companies/#{company.id}/contacts/search", params: { q: '' }, headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq('Specify search string with parameter q')
  end
end
