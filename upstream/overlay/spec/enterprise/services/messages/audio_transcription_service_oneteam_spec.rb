require 'rails_helper'

# OneTeam coverage for a fresh transcription: the text is saved on the
# attachment, the message is re-broadcast and (with advanced search)
# reindexed. A rejected OpenAI key is reported instead of raised.
RSpec.describe Messages::AudioTranscriptionService do
  let(:account) { create(:account, audio_transcriptions: true) }
  let(:message) { create(:message, account: account) }
  let(:attachment) do
    message.attachments.create!(account: account, file_type: :audio,
                                file: { io: Rails.public_path.join('audio/widget/ding.mp3').open, filename: 'note.mp3', content_type: 'audio/mpeg' })
  end
  let(:speech_to_text) { instance_double(Llm::SpeechToTextService) }

  before do
    allow(Llm::SpeechToTextService).to receive_messages(available_for?: true, new: speech_to_text)
  end

  it 'saves a new transcription, broadcasts it and reindexes the message' do
    allow(speech_to_text).to receive(:perform).and_return('Hello there')
    allow(ChatwootApp).to receive(:advanced_search_allowed?).and_return(true)
    allow_any_instance_of(Message).to receive(:reindex) # rubocop:disable RSpec/AnyInstance

    expect(described_class.new(attachment).perform).to eq(success: true, transcriptions: 'Hello there')
    expect(attachment.reload.meta).to eq('transcribed_text' => 'Hello there')
    expect(Llm::SpeechToTextService).to have_received(:new).with(blob: attachment.file.blob, account: account)
  end

  it 'saves nothing when the transcription is empty' do
    allow(speech_to_text).to receive(:perform).and_return('')

    expect(described_class.new(attachment).perform).to eq(success: true, transcriptions: '')
    expect(attachment.reload.meta).to be_blank
  end

  it 'reports a rejected OpenAI key' do
    allow(speech_to_text).to receive(:perform).and_raise(Faraday::UnauthorizedError, '401')

    expect(described_class.new(attachment).perform).to eq(error: 'OpenAI configuration is invalid or disabled (401)')
  end

  it 'reports a missing message' do
    expect(described_class.new(instance_double(Attachment, message: nil)).perform).to eq(error: 'Message not found')
  end
end
