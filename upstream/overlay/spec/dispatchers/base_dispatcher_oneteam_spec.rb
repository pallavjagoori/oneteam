# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the base dispatcher has no listeners of its own.
RSpec.describe BaseDispatcher do
  it 'has no listeners' do
    expect(described_class.new.listeners).to eq([])
  end
end
