require 'rails_helper'

# OneTeam coverage: Chatwoot Cloud screens new accounts' websites for scams.
RSpec.describe Internal::AccountAnalysisJob do
  let(:account) { create(:account) }
  let(:analyser) { instance_double(Internal::AccountAnalysis::ThreatAnalyserService, perform: true) }

  before { allow(Internal::AccountAnalysis::ThreatAnalyserService).to receive(:new).with(account).and_return(analyser) }

  it 'analyses the account on Chatwoot Cloud' do
    allow(ChatwootApp).to receive(:chatwoot_cloud?).and_return(true)

    described_class.perform_now(account)

    expect(analyser).to have_received(:perform)
  end

  it 'does nothing on a self-hosted install' do
    allow(ChatwootApp).to receive(:chatwoot_cloud?).and_return(false)

    described_class.perform_now(account)

    expect(analyser).not_to have_received(:perform)
  end
end
