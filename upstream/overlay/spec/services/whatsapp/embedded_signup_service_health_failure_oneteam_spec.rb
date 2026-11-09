# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a failing health check after signup is logged, not raised.
RSpec.describe Whatsapp::EmbeddedSignupService do
  it 'logs a health check failure' do
    service = described_class.new(account: create(:account), params: {})
    allow(Whatsapp::HealthService).to receive(:new).and_raise(StandardError, 'graph down')
    allow(Rails.logger).to receive(:error)

    service.send(:check_channel_health_and_prompt_reauth, Struct.new(:phone_number).new('+15550001111'))

    expect(Rails.logger).to have_received(:error).with('[WHATSAPP] Health check failed for channel +15550001111: graph down')
  end
end
