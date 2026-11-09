require 'rails_helper'

# OneTeam coverage for installing tracing on a Captain runner when
# OpenTelemetry is on. The agents gem only loads its instrumentation when
# OpenTelemetry is configured, so the spec stands in for it.
RSpec.describe Captain::Assistant::RunnerInstrumentationHelper do
  it 'installs instrumentation and the trace input callback' do
    host = Class.new do
      include Captain::Assistant::RunnerInstrumentationHelper

      def register_trace_input_callback(_runner); end
    end.new
    runner = Object.new
    allow(ChatwootApp).to receive(:otel_enabled?).and_return(true)
    allow(host).to receive(:trace_config).and_return({ name: 'llm.captain_v2', tags: ['captain_v2'] })
    allow(host).to receive(:register_trace_input_callback)
    allow(OpentelemetryConfig).to receive(:tracer).and_return(nil)
    stub_const('Agents::Instrumentation', Module.new { def self.install(*, **) = nil })
    allow(Agents::Instrumentation).to receive(:install)

    host.send(:install_instrumentation, runner)

    expect(Agents::Instrumentation).to have_received(:install).with(runner, hash_including(:attribute_provider))
    expect(host).to have_received(:register_trace_input_callback).with(runner)
  end
end
