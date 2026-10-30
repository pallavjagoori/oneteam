require 'rails_helper'

# OneTeam coverage for the one-time OpenTelemetry setup behind Langfuse
# tracing. It exports spans to Langfuse's OTLP endpoint only when the
# provider is `langfuse` and the URL and both keys are set; otherwise, or
# when setup fails, tracing stays a no-op. The SDK setup is stubbed so the
# global tracer provider is left alone.
RSpec.describe OpentelemetryConfig do
  let(:configurator) { instance_double(OpenTelemetry::SDK::Configurator, 'service_name=': nil, add_span_processor: nil) }
  let(:settings) do
    { 'OTEL_PROVIDER' => 'langfuse', 'LANGFUSE_BASE_URL' => 'https://langfuse.example', 'LANGFUSE_PUBLIC_KEY' => 'pk',
      'LANGFUSE_SECRET_KEY' => 'sk' }
  end

  around do |example|
    described_class.reset!
    example.run
  ensure
    described_class.reset!
  end

  before do
    allow(OpenTelemetry::SDK).to receive(:configure).and_yield(configurator)
    allow(OpenTelemetry::Exporter::OTLP::Exporter).to receive(:new).and_call_original
    allow(Rails.logger).to receive(:error)
  end

  def configure_with(values)
    values.each { |name, value| InstallationConfig.find_or_initialize_by(name: name).update!(value: value) }
    described_class.tracer
  end

  it 'exports to Langfuse with basic auth and the ingestion version header, once' do
    configure_with(settings)
    described_class.tracer

    expect(OpenTelemetry::Exporter::OTLP::Exporter).to have_received(:new).once.with(
      endpoint: 'https://langfuse.example/api/public/otel/v1/traces',
      headers: { 'Authorization' => "Basic #{Base64.strict_encode64('pk:sk')}", 'x-langfuse-ingestion-version' => '4' }
    )
    expect(configurator).to have_received(:service_name=).with('chatwoot')
    expect(configurator).to have_received(:add_span_processor).with(an_instance_of(OpenTelemetry::SDK::Trace::Export::BatchSpanProcessor))
    expect(described_class).to be_initialized
  end

  it 'skips certificate checks in development' do
    allow(Rails.env).to receive(:development?).and_return(true)

    configure_with(settings)

    expect(OpenTelemetry::Exporter::OTLP::Exporter).to have_received(:new).with(hash_including(ssl_verify_mode: OpenSSL::SSL::VERIFY_NONE))
  end

  it 'stays off for another provider' do
    configure_with(settings.merge('OTEL_PROVIDER' => 'datadog'))

    expect(OpenTelemetry::SDK).not_to have_received(:configure)
    expect(described_class).to be_initialized
  end

  it 'stays off, logging why, when a Langfuse setting is missing' do
    configure_with(settings.merge('LANGFUSE_PUBLIC_KEY' => ''))

    expect(OpenTelemetry::SDK).not_to have_received(:configure)
    expect(Rails.logger).to have_received(:error).with(a_string_including('LANGFUSE_PUBLIC_KEY'))
  end

  it 'logs a failed setup and does not retry it' do
    allow(OpenTelemetry::SDK).to receive(:configure).and_raise('bad endpoint')

    expect(configure_with(settings)).to respond_to(:in_span)
    described_class.initialize!

    expect(Rails.logger).to have_received(:error).with('Failed to configure OpenTelemetry: bad endpoint')
    expect(OpenTelemetry::SDK).to have_received(:configure).once
  end
end
