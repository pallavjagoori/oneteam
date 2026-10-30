require 'rails_helper'

# OneTeam coverage for the shared part of CRM integrations: routing each
# Chatwoot event to the processor's handler, rejecting unknown events,
# turning handler errors into a failed result, and the abstract methods
# every CRM must provide.
describe Crm::BaseProcessorService do
  let(:hook) { create(:integrations_hook) }
  let(:processor_class) do
    Class.new(described_class) do
      def self.crm_name
        'acme'
      end

      %w[contact_created contact_updated conversation_created conversation_updated].each do |event|
        define_method(:"handle_#{event}") { |data| { success: true, handled: event, data: data } }
      end
    end
  end

  it 'routes each event to its handler' do
    processor = processor_class.new(hook)

    %w[contact.created contact.updated conversation.created conversation.updated].each do |event|
      expect(processor.process_event(event, :data)).to eq(success: true, handled: event.tr('.', '_'), data: :data)
    end
  end

  it 'rejects events it does not know' do
    expect(processor_class.new(hook).process_event('message.created', {})).to eq(success: false, error: 'Unsupported event: message.created')
  end

  it 'returns handler errors as a failed result' do
    allow(Rails.logger).to receive(:error)
    processor = processor_class.new(hook)
    allow(processor).to receive(:handle_contact_created).and_raise(StandardError, 'CRM down')

    expect(processor.process_event('contact.created', {})).to eq(success: false, error: 'CRM down')
    expect(Rails.logger).to have_received(:error).with('acme Processor Error: CRM down')
  end

  it 'makes every CRM define its name and handlers' do
    base = Class.new(described_class).new(hook)

    expect { described_class.crm_name }.to raise_error(NotImplementedError)
    %i[handle_contact_created handle_contact_updated handle_conversation_created handle_conversation_resolved].each do |handler|
      expect { base.public_send(handler, nil) }.to raise_error(NotImplementedError)
    end
  end
end
