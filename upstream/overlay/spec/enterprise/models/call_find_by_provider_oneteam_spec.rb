# frozen_string_literal: true

require 'rails_helper'

# OneTeam: calls are looked up by provider and provider call id.
RSpec.describe Call do
  it 'finds nothing for an unknown provider call id' do
    expect(described_class.find_by_provider_call_id('twilio', 'CA-missing')).to be_nil
  end
end
