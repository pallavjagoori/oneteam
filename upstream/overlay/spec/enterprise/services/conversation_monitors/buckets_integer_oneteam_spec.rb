# frozen_string_literal: true

require 'rails_helper'

# OneTeam: bucket parameters must be whole numbers.
RSpec.describe ConversationMonitors::Buckets do
  it 'rejects a non-numeric value' do
    expect { described_class.integer!('12a') }.to raise_error(CustomExceptions::MonitorParametersError)
  end
end
