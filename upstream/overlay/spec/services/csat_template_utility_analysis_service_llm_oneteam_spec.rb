require 'rails_helper'

# OneTeam coverage for the AI review of a CSAT template message: when the
# rules don't already flag it as marketing, the model's classification and
# rewrite are used (falling back to the rule-based rewrite when the model
# gives none), and a model error falls back to the rule-based result.
RSpec.describe CsatTemplateUtilityAnalysisService do
  let(:account) { build_stubbed(:account) }
  let(:inbox) { build_stubbed(:inbox) }
  let(:message) { 'Your support request has been closed. If you still need help, reply to this message.' }
  let(:llm_service) { instance_double(Captain::CsatUtilityAnalysisService) }

  before { allow(Captain::CsatUtilityAnalysisService).to receive(:new).and_return(llm_service) }

  def analyse
    described_class.new(account: account, inbox: inbox, message: message).perform
  end

  it 'uses the model’s classification and rewrite' do
    allow(llm_service).to receive(:perform).and_return(classification: 'NEEDS_REVIEW', optimized_message: 'Rate your support chat')

    expect(analyse).to eq(classification: 'NEEDS_REVIEW', optimized_message: 'Rate your support chat')
  end

  it 'keeps the original message when the model offers no rewrite' do
    allow(llm_service).to receive(:perform).and_return(classification: :LIKELY_UTILITY, optimized_message: '')

    expect(analyse).to eq(classification: 'LIKELY_UTILITY', optimized_message: message)
  end

  it 'falls back to the rules when the model fails' do
    allow(llm_service).to receive(:perform).and_raise(StandardError, 'timeout')
    allow(Rails.logger).to receive(:error)

    expect(analyse).to include(classification: 'LIKELY_UTILITY')
    expect(Rails.logger).to have_received(:error).with("CSAT utility LLM analysis failed for inbox #{inbox.id}: timeout")
  end
end
