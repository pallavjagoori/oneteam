require 'rails_helper'

# OneTeam coverage for connecting a WhatsApp number through manual setup
# (version 2): it validates the number, creates the channel and inbox, then
# registers the webhook. A webhook failure does not undo the inbox; it is
# reported back so the agent can retry. Meta calls are doubles.
RSpec.describe Whatsapp::ManualSetupService do
  subject(:service) do
    described_class.new(account: account, waba_id: 'waba-1', phone_number_id: 'phone-1', access_token: 'token', inbox_name: inbox_name)
  end

  let(:account) { create(:account) }
  let(:inbox_name) { nil }
  let(:preview) do
    { display_phone_number: '+15550102000', phone_number_id: 'phone-1', waba_id: 'waba-1', suggested_inbox_name: 'Acme WhatsApp' }
  end
  let(:webhook_setup) { instance_double(Whatsapp::WebhookSetupService, perform: true, registration_error: nil) }

  before do
    allow(Whatsapp::ManualSetupValidationService).to receive(:new)
      .with(waba_id: 'waba-1', phone_number_id: 'phone-1', access_token: 'token')
      .and_return(instance_double(Whatsapp::ManualSetupValidationService, perform: preview))
    allow(Whatsapp::Providers::WhatsappCloudService).to receive(:new)
      .and_return(instance_double(Whatsapp::Providers::WhatsappCloudService, validate_provider_config?: true, sync_templates: nil))
    allow(Whatsapp::WebhookSetupService).to receive(:new).and_return(webhook_setup)
  end

  it 'creates a manual-setup channel and an inbox with the suggested name' do
    service.perform

    expect(service.channel).to have_attributes(phone_number: '+15550102000', provider: 'whatsapp_cloud')
    expect(service.channel.provider_config).to include(
      'api_key' => 'token', 'phone_number_id' => 'phone-1', 'business_account_id' => 'waba-1', 'source' => 'manual_setup_v2'
    )
    expect(service.channel.inbox.name).to eq('Acme WhatsApp')
    expect(service).to be_webhook_setup
    expect(Whatsapp::WebhookSetupService).to have_received(:new).with(service.channel, 'waba-1', 'token')
  end

  context 'with an inbox name' do
    let(:inbox_name) { '  Support  ' }

    it 'uses the trimmed name' do
      service.perform

      expect(service.channel.inbox.name).to eq('Support')
    end
  end

  it 'keeps the inbox and reports a webhook registration error' do
    allow(webhook_setup).to receive(:registration_error).and_return(StandardError.new('Registration failed'))

    expect { service.perform }.to change(account.inboxes, :count).by(1)
    expect(service.webhook_error).to eq('Registration failed')
    expect(service).not_to be_webhook_setup
  end

  it 'reports a webhook setup that raises' do
    allow(webhook_setup).to receive(:perform).and_raise(StandardError, 'Meta is down')

    service.perform

    expect(service.webhook_error).to eq('Meta is down')
  end
end
