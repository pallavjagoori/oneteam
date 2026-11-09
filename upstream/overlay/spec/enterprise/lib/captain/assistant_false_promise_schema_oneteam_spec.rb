require 'rails_helper'

RSpec.describe Captain::AssistantFalsePromiseSchema do
  it 'lists the allowed decisions and reasons' do
    expect(described_class::DECISIONS).to eq(%w[safe future_work_promise])
    expect(described_class::REASONS).to include('safe_response', 'background_escalation_promise')
  end

  it 'is a Schematist schema' do
    expect(described_class.ancestors).to include(Schematist::Schema)
  end
end
