# frozen_string_literal: true

require 'rails_helper'

# OneTeam: Stripe events the service does not handle are only logged.
RSpec.describe Enterprise::Billing::HandleStripeEventService do
  it 'ignores an unhandled event type' do
    event = Struct.new(:type).new('invoice.paid')
    allow(Rails.logger).to receive(:debug)

    described_class.new.perform(event: event)

    expect(Rails.logger).to have_received(:debug)
  end
end
