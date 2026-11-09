require 'rails_helper'

RSpec.describe Captain::FaqObservation do
  it 'rejects an FAQ suggestion from another account' do
    observation = described_class.new(account_id: 1)
    allow(observation).to receive(:faq_suggestion).and_return(instance_double(Captain::FaqSuggestion, account_id: 2))

    observation.send(:faq_suggestion_belongs_to_account)

    expect(observation.errors[:faq_suggestion]).to be_present
  end
end
