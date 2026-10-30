require 'rails_helper'

# OneTeam coverage: the threat analysis prompt embeds the website content and
# asks for a fixed JSON verdict, which ThreatAnalyserService then reads.
RSpec.describe Internal::AccountAnalysis::PromptsService do
  it 'embeds the website content and asks for the JSON verdict' do
    prompt = described_class.threat_analyser('Buy cheap watches')

    expect(prompt).to include("Website content:\nBuy cheap watches\n")
    expect(prompt).to include('"threat_level": "none|low|medium|high"', '"recommendation": "approve|review|block"')
  end
end
