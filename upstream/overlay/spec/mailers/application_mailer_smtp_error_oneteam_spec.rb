require 'rails_helper'

# OneTeam coverage for the SMTP error handler shared by all mailers.
RSpec.describe ApplicationMailer do
  it 'logs SMTP failures instead of raising' do
    allow(Rails.logger).to receive(:warn)
    allow(Rails.logger).to receive(:error)

    described_class.new.send(:handle_smtp_exceptions, 'connection refused')

    expect(Rails.logger).to have_received(:warn).with('Failed to send Email')
    expect(Rails.logger).to have_received(:error).with('Exception: connection refused')
  end
end
