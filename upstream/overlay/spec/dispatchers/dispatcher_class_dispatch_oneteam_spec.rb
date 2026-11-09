# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the class-level shortcut forwards to the configured dispatcher.
RSpec.describe Dispatcher do
  it 'forwards dispatch to the configured dispatcher' do
    timestamp = Time.zone.now
    allow(Rails.configuration.dispatcher).to receive(:dispatch)

    described_class.dispatch('some.event', timestamp, { id: 1 }, true)

    expect(Rails.configuration.dispatcher).to have_received(:dispatch).with('some.event', timestamp, { id: 1 }, true)
  end
end
