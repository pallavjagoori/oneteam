require 'rails_helper'

# OneTeam coverage for the OAuth "connect" endpoints when the provider gives
# no authorisation URL back: each one answers 422 with success false instead
# of redirecting the admin.
RSpec.describe 'OAuth authorization failures (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:auth_code) { instance_double(OAuth2::Strategy::AuthCode, authorize_url: nil) }
  let(:oauth_client) { instance_double(OAuth2::Client, auth_code: auth_code) }

  before { allow(OAuth2::Client).to receive(:new).and_return(oauth_client) }

  %w[google microsoft notion instagram].each do |provider|
    it "returns 422 when #{provider} gives no authorization url" do
      post "/api/v1/accounts/#{account.id}/#{provider}/authorization", headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq('success' => false)
    end
  end

  it 'returns 422 when TikTok gives no authorization url' do
    account.enable_features!('channel_tiktok')
    allow(Tiktok::AuthClient).to receive(:authorize_url).and_return(nil)

    post "/api/v1/accounts/#{account.id}/tiktok/authorization", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body).to eq('success' => false)
  end

  it 'returns 422 when Twitter refuses the request token' do
    twitter_client = double
    allow(Twitty::Facade).to receive(:new).and_return(twitter_client)
    allow(twitter_client).to receive(:request_oauth_token).and_return(Struct.new(:status).new('401'))

    post "/api/v1/accounts/#{account.id}/twitter/authorization", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body).to eq('success' => false)
  end
end
