# frozen_string_literal: true

require 'rails_helper'

# OneTeam: only the known usage columns may be queried.
RSpec.describe Captain::ConversationUsageBuilder do
  it 'rejects an unknown usage column' do
    expect { described_class.send(:validate_usage_column, :secrets) }
      .to raise_error(ArgumentError, 'Unsupported conversation usage column: secrets')
  end
end
