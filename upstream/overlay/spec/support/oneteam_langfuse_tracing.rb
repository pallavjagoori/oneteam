require 'opentelemetry/sdk'

# Turns on Chatwoot's Langfuse tracing for one example and records the spans
# in memory instead of exporting them. Specs then check the span names and
# attributes Langfuse receives, which the port must send the same way.
RSpec.shared_context 'with Langfuse tracing' do
  let(:span_exporter) { OpenTelemetry::SDK::Trace::Export::InMemorySpanExporter.new }
  let(:tracer_provider) do
    OpenTelemetry::SDK::Trace::TracerProvider.new.tap do |provider|
      provider.add_span_processor(OpenTelemetry::SDK::Trace::Export::SimpleSpanProcessor.new(span_exporter))
    end
  end

  before do
    InstallationConfig.find_or_initialize_by(name: 'OTEL_PROVIDER').update!(value: 'langfuse')
    InstallationConfig.find_or_initialize_by(name: 'LANGFUSE_SECRET_KEY').update!(value: 'sk-test')
    allow(OpentelemetryConfig).to receive(:tracer).and_return(tracer_provider.tracer('chatwoot'))
  end

  # Finished spans, oldest first.
  def finished_spans
    span_exporter.finished_spans
  end

  def span_named(name)
    finished_spans.find { |span| span.name == name } || raise("No span named #{name}: #{finished_spans.map(&:name)}")
  end
end
