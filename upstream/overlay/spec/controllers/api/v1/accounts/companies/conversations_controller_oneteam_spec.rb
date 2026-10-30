require 'rails_helper'

# OneTeam coverage for a company's Conversations tab: it lists conversations
# from every contact linked to the company, with all and open counts, and can
# narrow them with the same advanced filters as the main conversation list.
RSpec.describe 'Company conversations API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:company) { create(:company, account: account) }
  let(:contact) { create(:contact, account: account, company: company) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/companies/#{company.id}/conversations" }
  let!(:open_conversation) { create(:conversation, account: account, contact: contact) }
  let!(:resolved_conversation) { create(:conversation, account: account, contact: contact, status: :resolved) }

  before do
    account.enable_features!(:companies)
    create(:conversation, account: account)
  end

  describe 'GET /companies/:company_id/conversations' do
    it 'lists only conversations of the company contacts, with counts' do
      get base_url, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body['payload'].pluck('id')).to contain_exactly(open_conversation.display_id, resolved_conversation.display_id)
      expect(body['meta']).to include('total_count' => 2, 'all_count' => 2, 'open_count' => 1, 'page' => 1)
    end

    it 'hides conversations from agents outside the inbox' do
      agent = create(:user, account: account, role: :agent)

      get base_url, headers: agent.create_new_auth_token, as: :json

      expect(response.parsed_body['payload']).to be_empty
      expect(response.parsed_body['meta']['all_count']).to eq(0)
    end

    it 'is forbidden when companies are not enabled' do
      account.disable_features!(:companies)

      get base_url, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body['error']).to eq('Companies are not enabled for this account')
    end
  end

  describe 'POST /companies/:company_id/conversations/filter' do
    def filter(attribute_key, operator, values)
      post "#{base_url}/filter",
           params: { payload: [{ attribute_key: attribute_key, filter_operator: operator, values: values }] },
           headers: admin.create_new_auth_token, as: :json
    end

    it 'applies the filters to the company conversations' do
      filter('status', 'equal_to', ['resolved'])

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['payload'].pluck('id')).to eq([resolved_conversation.display_id])
      expect(response.parsed_body['meta']['all_count']).to eq(2)
    end

    it 'rejects an unknown filter attribute' do
      filter('phone_number', 'equal_to', ['open'])

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to include('Invalid attribute key - [phone_number]')
    end
  end
end
