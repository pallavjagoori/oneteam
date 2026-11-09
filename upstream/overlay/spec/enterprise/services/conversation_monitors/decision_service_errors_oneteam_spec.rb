require 'rails_helper'

# OneTeam coverage for monitor decisions the provider answers with invalid
# JSON or an unexpected HTTP status.
RSpec.describe ConversationMonitors::DecisionService do
  let(:service) { described_class.new(account_id: 1, conversation_id: 2) }

  it 'reports unparseable responses as invalid' do
    allow(ConversationMonitors::Configuration).to receive(:configured?).and_return(true)
    allow(service).to receive(:request_body).and_return('{}')
    allow(service).to receive(:request_decision).and_raise(JSON::ParserError)

    expect { service.evaluate(state: {}, monitors: []) }
      .to raise_error(CustomExceptions::MonitorEvaluationError) { |error| expect(error.code).to eq('invalid_response') }
  end

  it 'maps unexpected HTTP statuses to provider_unavailable' do
    error = service.send(:monitor_error, Struct.new(:status, :retry_after).new(500, 30))

    expect(error.code).to eq('provider_unavailable')
    expect(error.retry_after).to eq(30)
  end
end
