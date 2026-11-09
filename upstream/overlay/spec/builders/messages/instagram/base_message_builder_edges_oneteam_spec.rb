require 'rails_helper'

# OneTeam coverage for the shared Instagram builder: echo messages use the
# recipient id, story downloads that fail are only logged, and the story
# lookup is left to subclasses.
describe Messages::Instagram::BaseMessageBuilder do
  let(:messaging) { { sender: { id: 'sender-1' }, recipient: { id: 'recipient-1' } } }

  it 'uses the recipient id for outgoing echoes' do
    builder = described_class.new(messaging, instance_double(Inbox), outgoing_echo: true)

    expect(builder.send(:message_source_id)).to eq('recipient-1')
  end

  it 'keeps the story reply when the story cannot be downloaded' do
    message = create(:message)
    builder = described_class.new(messaging, message.inbox)
    builder.instance_variable_set(:@message, message)
    allow(builder).to receive(:attach_file).and_raise(Down::NotFound, 'gone')
    allow(Rails.logger).to receive(:warn)

    builder.send(:create_story_reply_attachment, 'https://cdn.example/story.jpg')

    expect(message.reload.attachments.first.file_type).to eq('ig_story')
    expect(message.content_attributes['image_type']).to eq('ig_story_reply')
    expect(Rails.logger).to have_received(:warn).with('Failed to download Instagram story attachment: gone')
  end

  it 'leaves the story lookup to subclasses' do
    expect { described_class.new(messaging, instance_double(Inbox)).send(:get_story_object_from_source_id, 'x') }
      .to raise_error(NotImplementedError)
  end
end
