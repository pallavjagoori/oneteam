require 'rails_helper'

# OneTeam coverage for "Enrich" on a company: it fills the company's details
# from its domain through the configured brand data provider. It needs the
# company_enrichment feature, an admin, a configured provider and a domain.
RSpec.describe 'Company enrichment API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:company) { create(:company, account: account, name: 'Acme', domain: 'acme.com') }
  let(:url) { "/api/v1/accounts/#{account.id}/companies/#{company.id}/enrichment" }
  let(:enrichment) { instance_double(Companies::EnrichmentService, perform: true) }

  before do
    account.enable_features!(:companies, :company_enrichment)
    allow(Companies::EnrichmentService).to receive(:enabled?).and_return(true)
    allow(Companies::EnrichmentService).to receive(:new).with(company, overwrite: true).and_return(enrichment)
  end

  it 'enriches the company and returns it' do
    post url, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['payload']['id']).to eq(company.id)
    expect(enrichment).to have_received(:perform)
  end

  it 'explains when the provider knows nothing about the domain' do
    allow(enrichment).to receive(:perform).and_return(nil)

    post url, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body['error']).to eq(I18n.t('errors.companies.enrichment.not_found'))
  end

  it 'needs the company_enrichment feature' do
    account.disable_features!(:company_enrichment)

    post url, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:forbidden)
    expect(response.parsed_body['error']).to eq(I18n.t('errors.companies.enrichment.plan_required'))
  end

  it 'needs a configured provider' do
    allow(Companies::EnrichmentService).to receive(:enabled?).and_return(false)

    post url, headers: admin.create_new_auth_token, as: :json

    expect(response.parsed_body['error']).to eq(I18n.t('errors.companies.enrichment.not_configured'))
  end

  it 'needs a company domain' do
    company.update!(domain: nil)

    post url, headers: admin.create_new_auth_token, as: :json

    expect(response.parsed_body['error']).to eq(I18n.t('errors.companies.enrichment.domain_missing'))
  end

  it 'is admin only' do
    agent = create(:user, account: account, role: :agent)

    post url, headers: agent.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unauthorized)
    expect(enrichment).not_to have_received(:perform)
  end
end
