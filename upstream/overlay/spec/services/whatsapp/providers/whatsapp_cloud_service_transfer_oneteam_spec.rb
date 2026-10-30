require 'rails_helper'

# OneTeam coverage for failed embedded-to-manual transfers and voice notes
# whose content type cannot be corrected.
RSpec.describe Whatsapp::Providers::WhatsappCloudService do
  subject(:service) { described_class.new(whatsapp_channel: whatsapp_channel) }

  let(:whatsapp_channel) { create(:channel_whatsapp, provider: 'whatsapp_cloud', sync_templates: false, validate_provider_config: false) }

  it 'logs the Meta error when a transfer check fails' do
    allow(whatsapp_channel).to receive(:embedded_to_manual_transfer_pending?).and_return(true)
    response = instance_double(HTTParty::Response, code: 400, parsed_response: { 'error' => { 'message' => 'Invalid token' } })
    allow(Rails.logger).to receive(:warn)

    expect(service.send(:log_transfer_failure, 'waba_or_token_check', response)).to be(false)
    expect(Rails.logger).to have_received(:warn).with(/check=waba_or_token_check http_status=400 meta_error=Invalid token/)
  end

  it 'logs when an Opus voice note cannot be renamed to audio/ogg' do
    message = create(:message, inbox: whatsapp_channel.inbox)
    attachment = message.attachments.new(account_id: message.account_id, file_type: :audio)
    attachment.file.attach(io: StringIO.new('ogg'), filename: 'voice.ogg', content_type: 'audio/opus')
    blob = attachment.file.blob
    allow(blob).to receive_messages(content_type: 'audio/opus', update: false)
    allow(attachment.file).to receive(:blob).and_return(blob)
    allow(Rails.logger).to receive(:error)

    service.send(:normalize_opus_content_type, attachment)

    expect(Rails.logger).to have_received(:error).with(/Failed to normalize blob/)
  end
end
