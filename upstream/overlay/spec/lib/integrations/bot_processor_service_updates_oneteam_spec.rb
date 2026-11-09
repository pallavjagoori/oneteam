require 'rails_helper'

# OneTeam coverage for bot processors handling message updates: the
# submitted option is used as the content, and only input selects count.
RSpec.describe Integrations::BotProcessorService do
  let(:message) { build(:message, content: 'Pick one', content_type: 'input_select', content_attributes: { submitted_values: [{ value: 'yes' }] }) }

  it 'uses the submitted value for updated messages' do
    service = described_class.new(event_name: 'message.updated', hook: nil, event_data: {})

    expect(service.send(:message_content, message)).to eq('yes')
    expect(service.send(:processable_outgoing_message?, message)).to be(true)
  end

  it 'uses the message content for other events' do
    service = described_class.new(event_name: 'message.created', hook: nil, event_data: {})

    expect(service.send(:message_content, message)).to eq('Pick one')
  end
end
