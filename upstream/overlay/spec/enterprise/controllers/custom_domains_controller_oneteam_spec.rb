require 'rails_helper'

# OneTeam coverage for Cloudflare's custom hostname check. When a help center
# portal gets a custom domain, Cloudflare fetches a challenge URL on that
# domain and expects the verification body Chatwoot stored for the portal.
RSpec.describe 'Custom domain verification', type: :request do
  let(:path) { '/.well-known/cf-custom-hostname-challenge/challenge-1' }

  before do
    host! 'help.acme.com'
    create(:portal, custom_domain: 'help.acme.com',
                    ssl_settings: { 'cf_verification_id' => 'challenge-1', 'cf_verification_body' => 'token-body' })
  end

  it 'answers the challenge with the stored body' do
    get path

    expect(response).to have_http_status(:ok)
    expect(response.body).to eq('token-body')
  end

  it 'rejects an unknown challenge id' do
    get '/.well-known/cf-custom-hostname-challenge/other'

    expect(response).to have_http_status(:not_found)
    expect(response.body).to eq('Challenge ID not found')
  end

  it 'rejects a domain without a portal' do
    host! 'unknown.example.org'

    get path

    expect(response).to have_http_status(:not_found)
    expect(response.body).to eq('Domain not found')
  end

  it 'treats a portal without a stored challenge as an unknown challenge' do
    host! 'docs.acme.com'
    create(:portal, custom_domain: 'docs.acme.com', ssl_settings: {})

    get path

    expect(response.body).to eq('Challenge ID not found')
  end
end
