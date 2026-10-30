require 'rails_helper'

# OneTeam coverage for sending attachments through 360dialog: images go as
# images with the message as caption, audio without a caption, and other
# files as documents with their file name. A rejected send marks the
# message failed with 360dialog's developer message.
describe Whatsapp::Providers::Whatsapp360DialogService do
  let(:channel) { create(:channel_whatsapp, sync_templates: false, validate_provider_config: false) }
  let(:service) { described_class.new(whatsapp_channel: channel) }
  let(:json) { { 'Content-Type' => 'application/json' } }

  def message_with(file_type, file, content_type, content: 'See attached')
    message = create(:message, message_type: :outgoing, content: content, inbox: channel.inbox)
    message.attachments.create!(account: message.account, file_type: file_type,
                                file: Rack::Test::UploadedFile.new(Rails.root.join("spec/assets/#{file}"), content_type))
    message
  end

  def expect_send(body)
    stub_request(:post, 'https://waba.360dialog.io/v1/messages').with(body: hash_including(body))
                                                                .to_return(status: 200, body: { messages: [{ id: 'wamid' }] }.to_json, headers: json)
  end

  it 'sends an image with the message as its caption' do
    message = message_with(:image, 'avatar.png', 'image/png')
    expect_send('to' => '+123', 'type' => 'image', 'image' => hash_including('caption' => 'See attached'))

    expect(service.send_message('+123', message)).to eq('wamid')
  end

  it 'sends other files as documents named after the file' do
    message = message_with(:file, 'sample.pdf', 'application/pdf')
    expect_send('type' => 'document', 'document' => hash_including('filename' => 'sample.pdf', 'caption' => 'See attached'))

    expect(service.send_message('+123', message)).to eq('wamid')
  end

  it 'sends audio without a caption' do
    message = message_with(:audio, 'sample.mp3', 'audio/mpeg')
    stub = expect_send('type' => 'audio')

    service.send_message('+123', message)

    expect(stub.with { |request| JSON.parse(request.body)['audio'].key?('caption') == false }).to have_been_requested
  end

  it 'marks the message failed with the developer message on an error' do
    message = message_with(:image, 'avatar.png', 'image/png')
    stub_request(:post, 'https://waba.360dialog.io/v1/messages')
      .to_return(status: 400, body: { meta: { success: false, developer_message: 'Media too large' } }.to_json, headers: json)

    expect(service.send_message('+123', message)).to be_nil
    expect(message.reload).to have_attributes(status: 'failed', external_error: 'Media too large')
  end
end
