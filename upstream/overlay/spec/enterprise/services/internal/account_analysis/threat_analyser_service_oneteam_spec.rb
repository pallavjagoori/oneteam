require 'rails_helper'

# OneTeam coverage: an account with no users has no email domain to check,
# so threat analysis is skipped.
RSpec.describe Internal::AccountAnalysis::ThreatAnalyserService do
  it 'skips an account that has no users' do
    account = create(:account)
    allow(Rails.logger).to receive(:info)
    allow(Internal::AccountAnalysis::WebsiteScraperService).to receive(:new)

    expect(described_class.new(account).perform).to be_nil
    expect(Rails.logger).to have_received(:info).with("Skipping threat analysis for account #{account.id}: No domain found")
    expect(Internal::AccountAnalysis::WebsiteScraperService).not_to have_received(:new)
  end
end
