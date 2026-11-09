require 'rails_helper'

RSpec.describe Twilio::TemplateSyncService do
  let(:service) { described_class.new(channel: instance_double(Channel::TwilioSms)) }

  def template(types)
    Struct.new(:types).new(types)
  end

  it 'reports image media templates' do
    expect(service.send(:derive_media_type, template('twilio/media' => { 'image' => 'x' }))).to eq('image')
  end

  it 'reports video media templates' do
    expect(service.send(:derive_media_type, template('twilio/media' => { 'video' => 'x' }))).to eq('video')
  end

  it 'reports document media templates' do
    expect(service.send(:derive_media_type, template('twilio/media' => { 'document' => 'x' }))).to eq('document')
  end

  it 'uses an empty body when no known content type is present' do
    expect(service.send(:extract_body_content, template('twilio/unknown' => {}))).to eq('')
  end
end
