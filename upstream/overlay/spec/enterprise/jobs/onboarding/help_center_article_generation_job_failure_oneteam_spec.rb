require 'rails_helper'

# OneTeam coverage for terminal failures while generating help center
# articles: the generation is marked skipped and the error raised.
RSpec.describe Onboarding::HelpCenterArticleGenerationJob do
  it 'records a skipped generation and re-raises' do
    allow(Onboarding::HelpCenterGenerationState).to receive(:current).and_return(nil)
    allow(Onboarding::HelpCenterGenerationState).to receive(:skip)

    expect { described_class.perform_now(0, 0, 0, 'gen-1') }.to raise_error(ActiveRecord::RecordNotFound)
    expect(Onboarding::HelpCenterGenerationState).to have_received(:skip).with('gen-1', reason: /ActiveRecord::RecordNotFound/)
  end
end
