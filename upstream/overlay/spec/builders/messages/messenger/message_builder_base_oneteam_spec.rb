require 'rails_helper'

# OneTeam coverage for the shared Messenger builder: the story lookup
# placeholder that subclasses override, and shared location attachments.
describe Messages::Messenger::MessageBuilder do
  let(:message) { create(:message) }
  let(:builder_class) do
    Class.new(described_class) do
      def initialize(message)
        super()
        @message = message
      end

      def location_params(attachment)
        { coordinates_lat: attachment['payload']['coordinates']['lat'] }
      end
    end
  end
  let(:builder) { builder_class.new(message) }

  it 'returns no story object by default' do
    expect(builder.send(:get_story_object_from_source_id, 'mid.1')).to eq({})
  end

  it 'reads location attachments through the subclass' do
    params = builder.attachment_params({ 'type' => 'location', 'payload' => { 'coordinates' => { 'lat' => 1.5 } } })

    expect(params).to eq(file_type: :location, account_id: message.account_id, coordinates_lat: 1.5)
  end
end
