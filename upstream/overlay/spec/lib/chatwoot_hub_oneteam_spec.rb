require 'rails_helper'

# OneTeam coverage for the rest of the Chatwoot Hub client: mobile push
# relay, billing links, plan details, and how each call handles the hub
# being unreachable (logged) or other errors (reported).
RSpec.describe ChatwootHub do
  let(:hub) { 'https://hub.2.chatwoot.com' }

  before { allow(Rails.logger).to receive(:error) }

  it 'relays a mobile push through the hub with the instance details' do
    push = stub_request(:post, "#{hub}/send_push").with { |request| JSON.parse(request.body)['fcm_options'] == { 'token' => 't' } }

    described_class.send_push({ token: 't' })

    expect(push).to have_been_requested
  end

  it 'links to billing for this installation' do
    expect(described_class.billing_url).to eq("#{hub}/billing?installation_identifier=#{described_class.installation_identifier}")
  end

  it 'reads the enterprise plan and seat count, defaulting to community and zero' do
    expect([described_class.pricing_plan, described_class.pricing_plan_quantity]).to eq(['community', 0])

    create(:installation_config, name: 'INSTALLATION_PRICING_PLAN', value: 'enterprise')
    create(:installation_config, name: 'INSTALLATION_PRICING_PLAN_QUANTITY', value: 25)
    expect([described_class.pricing_plan, described_class.pricing_plan_quantity]).to eq(['enterprise', 25])
  end

  it 'reports a community plan outside the enterprise edition' do
    allow(ChatwootApp).to receive(:enterprise?).and_return(false)

    expect([described_class.pricing_plan, described_class.pricing_plan_quantity]).to eq(['community', 0])
  end

  it 'uses CHATWOOT_HUB_URL in development' do
    allow(Rails.env).to receive(:development?).and_return(true)

    with_modified_env CHATWOOT_HUB_URL: 'http://localhost:3001' do
      expect(described_class.ping_url).to eq('http://localhost:3001/ping')
    end
  end

  {
    send_push: [{ token: 't' }],
    register_instance: %w[Acme Ada ada@example.com],
    emit_event: ['installation_created', {}]
  }.each do |call, arguments|
    describe ".#{call}" do
      it 'logs a hub error' do
        allow(RestClient).to receive(:post).and_raise(RestClient::BadGateway)

        expect(described_class.public_send(call, *arguments)).to be_nil
        expect(Rails.logger).to have_received(:error).with('Exception: Bad Gateway')
      end

      it 'reports any other error' do
        tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
        allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
        allow(RestClient).to receive(:post).and_raise(ArgumentError, 'bad payload')

        described_class.public_send(call, *arguments)

        expect(ChatwootExceptionTracker).to have_received(:new).with(an_instance_of(ArgumentError))
      end
    end
  end

  it 'reports an unreadable ping reply' do
    allow(ChatwootExceptionTracker).to receive(:new).and_return(instance_double(ChatwootExceptionTracker, capture_exception: true))
    allow(RestClient).to receive(:post).and_return('<html>')

    expect(described_class.sync_with_hub).to be_nil
    expect(ChatwootExceptionTracker).to have_received(:new).with(an_instance_of(JSON::ParserError))
  end
end
