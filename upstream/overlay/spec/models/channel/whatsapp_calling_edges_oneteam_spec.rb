require 'rails_helper'

# OneTeam coverage for WhatsApp channels: turning voice calling off while the
# webhook re-subscribe fails, and contact information requests on cloud and
# other providers.
RSpec.describe Channel::Whatsapp do
  let(:channel) { create(:channel_whatsapp, provider: 'whatsapp_cloud', sync_templates: false, validate_provider_config: false) }

  it 'disables calling even when the webhook re-subscribe fails' do
    service = instance_double(Whatsapp::WebhookSetupService)
    allow(service).to receive(:register_callback).and_raise(StandardError, 'meta down')
    allow(channel).to receive(:webhook_setup_service).and_return(service)
    allow(Rails.logger).to receive(:warn)

    channel.disable_voice_calling!

    expect(channel.reload.provider_config['calling_enabled']).to be(false)
    expect(Rails.logger).to have_received(:warn).with('[WHATSAPP CALL] disable webhook re-subscribe failed: meta down')
  end

  it 'sends contact information requests through the cloud API' do
    allow(Whatsapp::Providers::WhatsappCloudContactInfoRequestService).to receive(:perform).and_return('wamid.1')

    expect(channel.send_contact_info_request('+15550001111', 'Share your number')).to eq('wamid.1')
  end

  it 'refuses contact information requests on other providers' do
    other = create(:channel_whatsapp, provider: 'default', sync_templates: false, validate_provider_config: false)

    expect { other.send_contact_info_request('+15550001111', 'x') }.to raise_error(NotImplementedError)
  end
end
