require 'rails_helper'

# OneTeam coverage for the TikTok Business messaging API calls that
# Chatwoot's spec leaves out: the media download link, text replies (with
# and without a quoted message), image replies uploaded as multipart, and
# the errors raised when TikTok answers with a failed HTTP status.
describe Tiktok::Client do
  let(:client) { described_class.new(business_id: 'biz', access_token: 'token') }
  let(:api) { 'https://business-api.tiktok.com/open_api/v1.3/business/message' }
  let(:ok) { { headers: { 'Content-Type' => 'application/json' } } }

  before { allow(Rails.logger).to receive(:error) }

  def tiktok_json(data)
    { code: 0, message: 'OK', data: data }.to_json
  end

  it 'fetches a media download link' do
    stub_request(:post, "#{api}/media/download/")
      .with(headers: { 'Access-Token' => 'token' },
            body: { business_id: 'biz', conversation_id: 'c1', message_id: 'm1', media_id: 'img', media_type: 'IMAGE' }.to_json)
      .to_return(ok.merge(body: tiktok_json(download_url: 'https://cdn.tiktok.com/img')))

    expect(client.file_download_url('c1', 'm1', 'img')).to eq('https://cdn.tiktok.com/img')
  end

  it 'sends a text reply, quoting a message when given one' do
    stub = stub_request(:post, "#{api}/send/")
           .with(body: hash_including('message_type' => 'TEXT', 'text' => { 'body' => 'Hi' }, 'recipient' => 'c1',
                                      'referenced_message_info' => { 'referenced_message_id' => 'm0' }))
           .to_return(ok.merge(body: tiktok_json(message: { message_id: 'm2' })))

    expect(client.send_text_message('c1', 'Hi', referenced_message_id: 'm0')).to eq('m2')
    expect(stub).to have_been_requested
  end

  it 'uploads an image and sends it' do
    message = create(:message)
    attachment = message.attachments.create!(account: message.account, file_type: :image,
                                             file: Rack::Test::UploadedFile.new(Rails.root.join('spec/assets/avatar.png'), 'image/png'))
    stub_request(:post, "#{api}/media/upload/").with(headers: { 'Access-Token' => 'token' })
                                               .to_return(ok.merge(body: tiktok_json(media_id: 'media-1')))
    stub_request(:post, "#{api}/send/").with(body: hash_including('message_type' => 'IMAGE', 'image' => { 'media_id' => 'media-1' }))
                                       .to_return(ok.merge(body: tiktok_json(message: { message_id: 'm3' })))

    expect(client.send_media_message('c1', attachment)).to eq('m3')
  end

  it 'raises with the HTTP status when TikTok rejects a request' do
    stub_request(:post, "#{api}/send/").to_return(status: 500, body: 'oops')
    message = create(:message)
    attachment = message.attachments.create!(account: message.account, file_type: :image,
                                             file: Rack::Test::UploadedFile.new(Rails.root.join('spec/assets/avatar.png'), 'image/png'))
    stub_request(:post, "#{api}/media/upload/").to_return(status: 413, body: 'too big')

    expect { client.send_text_message('c1', 'Hi') }.to raise_error('500: oops')
    expect { client.send_media_message('c1', attachment) }.to raise_error('413: too big')
    expect(Rails.logger).to have_received(:error).with('Failed to upload TikTok media. Status: 413, Body: too big')
  end
end
