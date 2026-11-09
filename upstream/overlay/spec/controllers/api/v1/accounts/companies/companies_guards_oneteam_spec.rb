require 'rails_helper'

# OneTeam coverage for the companies API guards: the feature flag, social
# profile URLs that are not web links, and attribute removal without a list.
RSpec.describe 'Companies API guards (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:headers) { admin.create_new_auth_token }
  let(:base) { "/api/v1/accounts/#{account.id}/companies" }

  it 'answers 403 when companies are off' do
    get base, headers: headers

    expect(response).to have_http_status(:forbidden)
  end

  context 'with companies enabled' do
    let(:company) { create(:company, account: account) }

    before { account.enable_features!(:companies) }

    it 'rejects social profiles that are not web links' do
      patch "#{base}/#{company.id}", params: { company: { additional_attributes: { social_profiles: { twitter: 'javascript:alert(1)' } } } },
                                     headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'accepts social profiles that are web links' do
      patch "#{base}/#{company.id}", params: { company: { additional_attributes: { social_profiles: { twitter: 'https://x.com/acme' } } } },
                                     headers: headers, as: :json

      expect(response).to have_http_status(:success)
    end

    it 'asks for a list of attributes to remove' do
      post "#{base}/#{company.id}/destroy_custom_attributes", params: { custom_attributes: 'tier' }, headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body['error']).to eq('custom_attributes must be an array')
    end
  end
end
