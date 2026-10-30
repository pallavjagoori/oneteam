require 'rails_helper'

# OneTeam coverage for how Context.dev brand data fills a company: blank
# fields are filled and existing ones kept unless `overwrite: true`, only
# known social networks are kept, and a failed lookup changes nothing.
# Chatwoot's own spec covers the logo.
RSpec.describe Companies::EnrichmentService do
  let(:company) do
    create(:company, domain: 'example.com', description: 'Our own words', additional_attributes: { 'city' => 'Pune' })
  end
  let(:brand) do
    {
      description: 'Makes widgets', phone: '+1 555', logos: [],
      industries: { eic: [{ industry: 'Manufacturing', subindustry: 'Widgets' }] },
      employees: { range: '11-50', exact: 42 },
      address: { city: 'Berlin', country: 'Germany', country_code: 'DE' },
      socials: [{ type: 'linkedin', url: 'https://linkedin.com/company/example' }, { type: 'myspace', url: 'https://myspace.com/x' },
                { type: 'github', url: '' }]
    }
  end

  before do
    stub_request(:post, described_class::ENDPOINT)
      .to_return(status: 200, body: { brand: brand }.to_json, headers: { 'content-type' => 'application/json' })
  end

  it 'is enabled only when a Context.dev API key is configured' do
    expect(described_class.enabled?).to be(false)

    allow(GlobalConfigService).to receive(:load).with('CONTEXT_DEV_API_KEY', nil).and_return('key')
    expect(described_class.enabled?).to be(true)
  end

  it 'fills blank fields and keeps the ones already set' do
    freeze_time do
      described_class.new(company).perform

      expect(company.reload.description).to eq('Our own words')
      expect(company.additional_attributes).to eq(
        'city' => 'Pune', 'industry' => 'Manufacturing', 'sub_industry' => 'Widgets', 'employee_count_range' => '11-50',
        'employee_count' => 42, 'country' => 'Germany', 'country_code' => 'DE', 'phone' => '+1 555',
        'social_profiles' => { 'linkedin' => 'https://linkedin.com/company/example' }, 'enriched_at' => Time.current.iso8601
      )
    end
  end

  it 'replaces existing fields with overwrite' do
    described_class.new(company, overwrite: true).perform

    expect(company.reload.description).to eq('Makes widgets')
    expect(company.additional_attributes['city']).to eq('Berlin')
  end

  it 'fills a blank description' do
    company.update!(description: nil)

    described_class.new(company).perform

    expect(company.reload.description).to eq('Makes widgets')
  end

  it 'logs a failed lookup and changes nothing' do
    stub_request(:post, described_class::ENDPOINT).to_return(status: 402)
    allow(Rails.logger).to receive(:warn)

    expect(described_class.new(company).perform).to be_nil
    expect(Rails.logger).to have_received(:warn).with("[CompanyEnrichment] Context.dev returned 402 for company=#{company.id}")
    expect(company.reload.additional_attributes).to eq('city' => 'Pune')
  end
end
