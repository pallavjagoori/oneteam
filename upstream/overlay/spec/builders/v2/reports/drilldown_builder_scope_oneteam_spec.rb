require 'rails_helper'

# OneTeam coverage for the record a drilldown is scoped to, per dimension.
describe V2::Reports::DrilldownBuilder do
  let(:builder) { described_class.allocate }

  %w[inbox label team].each do |dimension|
    it "scopes #{dimension} drilldowns to the #{dimension}" do
      record = Object.new
      allow(builder).to receive_messages(:dimension_type => dimension, dimension.to_sym => record)

      expect(builder.send(:scope)).to be(record)
    end
  end

  it 'rejects unknown dimensions' do
    allow(builder).to receive(:dimension_type).and_return('planet')

    expect { builder.send(:scope) }.to raise_error(ArgumentError, 'Unsupported drilldown dimension type: planet')
  end
end
