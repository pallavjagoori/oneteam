require 'rails_helper'

# OneTeam coverage for the citation instructions added to the copilot prompt
# when citations are switched on.
RSpec.describe Captain::Llm::SystemPromptsService do
  it 'asks the copilot to cite its sources' do
    prompt = described_class.copilot_response_generator('Acme', [], { 'feature_citation' => true })

    expect(prompt).to include('Always include citations for any information provided')
    expect(prompt).to include('Cite the sources if you used a tool to find the response.')
  end
end
