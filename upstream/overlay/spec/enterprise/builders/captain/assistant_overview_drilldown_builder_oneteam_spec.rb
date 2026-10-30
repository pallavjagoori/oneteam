require 'rails_helper'

# OneTeam coverage for the guard in the Captain overview drilldown builder.
# The controller checks the metric first, so only a direct caller can reach it.
RSpec.describe Captain::AssistantOverviewDrilldownBuilder do
  it 'refuses a metric it does not support' do
    builder = described_class.new(create(:captain_assistant), { metric: 'csat' })

    expect { builder.build }.to raise_error(ArgumentError, 'Unsupported overview drilldown metric: csat')
  end
end
