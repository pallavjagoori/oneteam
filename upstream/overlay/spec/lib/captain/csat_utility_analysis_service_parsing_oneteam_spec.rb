require 'rails_helper'

# OneTeam coverage for CSAT utility analysis parsing: invalid JSON, unknown
# classifications and the event name.
RSpec.describe Captain::CsatUtilityAnalysisService do
  let(:service) { described_class.new(account: create(:account), message: 'Rate us', baseline: { classification: 'LIKELY_UTILITY' }) }

  it 'returns nil for invalid JSON' do
    expect(service.send(:parse_json_response, 'not json')).to be_nil
  end

  it 'falls back to the baseline classification' do
    expect(service.send(:normalize_classification, 'something else')).to eq('LIKELY_UTILITY')
  end

  it 'names its event' do
    expect(service.send(:event_name)).to eq('csat_utility_analysis')
  end
end
