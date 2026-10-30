require 'rails_helper'

# OneTeam coverage for a company's Notes tab: notes written on any contact
# linked to the company, newest first, with an optional text search.
RSpec.describe 'Company notes API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:company) { create(:company, account: account) }
  let(:contact) { create(:contact, account: account, company: company) }
  let(:url) { "/api/v1/accounts/#{account.id}/companies/#{company.id}/notes" }
  let!(:older_note) { create(:note, account: account, contact: contact, user: admin, content: 'Renewal call booked', created_at: 2.days.ago) }
  let!(:newer_note) { create(:note, account: account, contact: contact, user: admin, content: 'Asked about 100% discount') }

  before do
    account.enable_features!(:companies)
    create(:note, account: account, contact: create(:contact, account: account), user: admin, content: 'Renewal elsewhere')
  end

  it 'lists the company notes newest first with their contact' do
    get url, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    body = response.parsed_body
    expect(body['payload'].pluck('id')).to eq([newer_note.id, older_note.id])
    expect(body['payload'].first['contact']['id']).to eq(contact.id)
    expect(body['meta']).to eq('total_count' => 2, 'page' => 1)
  end

  it 'searches note text, treating % as a literal character' do
    get url, params: { q: ' 100% ' }, headers: admin.create_new_auth_token

    expect(response.parsed_body['payload'].pluck('id')).to eq([newer_note.id])
  end

  it 'returns 404 for a company in another account' do
    other_company = create(:company)

    get "/api/v1/accounts/#{account.id}/companies/#{other_company.id}/notes", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:not_found)
  end
end
