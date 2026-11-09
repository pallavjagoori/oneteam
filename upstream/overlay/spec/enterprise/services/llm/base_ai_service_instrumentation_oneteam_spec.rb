require 'rails_helper'

RSpec.describe Llm::BaseAiService do
  it 'adds the configured temperature and request metadata to instrumentation params' do
    service = described_class.allocate
    service.instance_variable_set(:@llm_feature, 'assistant')
    allow(Captain::ResponsesConfig).to receive(:options)
      .with(model: 'gpt-x', temperature: 0.5, feature: 'assistant').and_return(temperature: 0.2)
    allow(Captain::ResponsesConfig).to receive(:request_metadata)
      .with(model: 'gpt-x', feature: 'assistant').and_return(service_tier: 'flex')

    params = service.send(:llm_instrumentation_params, { model: 'gpt-x', temperature: 0.5, metadata: { account_id: 1 } })

    expect(params).to include(model: 'gpt-x', temperature: 0.2, metadata: { account_id: 1, service_tier: 'flex' })
  end
end
