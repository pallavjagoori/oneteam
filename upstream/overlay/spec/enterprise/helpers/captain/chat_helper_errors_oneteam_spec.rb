require 'rails_helper'

# OneTeam coverage for chat completions that fail, and the feature name each
# host must define.
RSpec.describe Captain::ChatHelper do
  let(:host) { Class.new { include Captain::ChatHelper }.new }

  before { host.instance_variable_set(:@assistant, Struct.new(:id).new(4)) }

  it 'logs and re-raises chat completion errors' do
    allow(host).to receive(:log_chat_completion_request)
    allow(host).to receive(:build_chat).and_raise(StandardError, 'no key')
    allow(Rails.logger).to receive(:error)

    expect { host.request_chat_completion }.to raise_error(StandardError, 'no key')
    expect(Rails.logger).to have_received(:error).with(/Assistant: 4, Error in chat completion: no key/)
  end

  it 'asks the host for a feature name' do
    expect { host.send(:feature_name) }.to raise_error(NotImplementedError, /must implement #feature_name/)
  end
end
