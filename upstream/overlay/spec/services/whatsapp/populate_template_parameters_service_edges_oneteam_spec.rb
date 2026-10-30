require 'rails_helper'

# OneTeam coverage for the less common template parameter shapes: plain
# values, unknown hash types, unsupported media and malformed URLs.
RSpec.describe Whatsapp::PopulateTemplateParametersService do
  subject(:service) { described_class.new }

  it 'turns numbers and unknown hashes into text parameters' do
    expect(service.build_parameter(42)).to eq(type: 'text', text: '42')
    expect(service.build_parameter({ 'type' => 'other' })[:type]).to eq('text')
  end

  it 'rejects media types WhatsApp does not support' do
    expect { service.build_media_parameter('https://example.com/a.mp3', 'audio') }
      .to raise_error(ArgumentError, 'Unsupported media type: audio')
  end

  it 'encodes spaces itself when the URL cannot be normalized' do
    allow(Addressable::URI).to receive(:parse).and_raise(Addressable::URI::InvalidURIError)

    expect(service.build_media_parameter('https://example.com/my file.png', 'image'))
      .to eq(type: 'image', image: { link: 'https://example.com/my%20file.png' })
  end

  it 'explains URLs Ruby cannot parse' do
    allow(URI).to receive(:parse).and_raise(URI::InvalidURIError, 'bad URI')

    expect { service.build_media_parameter('https://example.com/a.png', 'image') }
      .to raise_error(ArgumentError, /Invalid URL format: bad URI/)
  end
end
