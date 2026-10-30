require 'rails_helper'

# OneTeam coverage: the job hands the company to the enrichment service.
RSpec.describe Companies::EnrichJob do
  it 'enriches the company' do
    company = create(:company)
    service = instance_double(Companies::EnrichmentService, perform: true)
    allow(Companies::EnrichmentService).to receive(:new).with(company).and_return(service)

    described_class.perform_now(company)

    expect(service).to have_received(:perform)
  end

  it 'runs on the low queue' do
    expect(described_class.new.queue_name).to eq('low')
  end
end
