require 'rails_helper'

RSpec.describe Captain::Assistant::ResponseRewriter do
  it 'installs tracing on the runner when OpenTelemetry is enabled' do
    instrumentation = Module.new { def self.install(*, **) = nil }
    stub_const('Agents::Instrumentation', instrumentation)
    allow(instrumentation).to receive(:install)
    allow(ChatwootApp).to receive(:otel_enabled?).and_return(true)
    allow(OpentelemetryConfig).to receive(:tracer).and_return(:tracer)

    described_class.allocate.send(:install_instrumentation, :runner)

    expect(instrumentation).to have_received(:install)
      .with(:runner, hash_including(tracer: :tracer, trace_name: 'llm.captain_v2.rewrite'))
  end
end
