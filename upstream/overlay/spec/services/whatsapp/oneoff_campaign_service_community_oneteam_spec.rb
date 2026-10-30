require 'rails_helper'

# OneTeam coverage for the community edition of WhatsApp one-off campaigns.
# Enterprise replaces how each contact is sent (it keeps a recipient record
# per contact), so these specs run the community code: skip contacts with no
# destination, no template or unresolved template variables, skip blocked
# authentication templates, send the template otherwise, and carry on with
# the next contact when sending fails.
describe Whatsapp::OneoffCampaignService do
  let(:account) { create(:account) }
  let(:channel) { create(:channel_whatsapp, account: account, provider: 'whatsapp_cloud', validate_provider_config: false, sync_templates: false) }
  let(:label) { create(:label, account: account) }
  let(:template_params) do
    { 'name' => 'ticket_status_updated', 'namespace' => 'ns', 'language' => 'en', 'processed_params' => { 'body' => { '1' => 'John' } } }
  end
  let(:campaign) do
    create(:campaign, inbox: channel.inbox, account: account, audience: [{ type: 'Label', id: label.id }], template_params: template_params)
  end
  let(:service) do
    community_edition_of(described_class, :perform_batch, :process_contacts, :send_whatsapp_template_message,
                         :authentication_template_blocked?).new(campaign: campaign)
  end
  let!(:contact) { create(:contact, :with_phone_number, account: account).tap { |c| c.update_labels([label.title]) } }

  before do
    allow(Whatsapp::TemplateProcessorService).to receive(:new)
      .and_return(instance_double(Whatsapp::TemplateProcessorService, call: ['ticket_status_updated', 'ns', 'en', []]))
    allow(service).to receive(:channel).and_return(channel)
    allow(Rails.logger).to receive(:warn)
    allow(Rails.logger).to receive(:error)
    allow(Rails.logger).to receive(:info)
  end

  it 'sends the template to each contact in the audience' do
    expect(channel).to receive(:send_template)
      .with(contact.phone_number, { name: 'ticket_status_updated', namespace: 'ns', lang_code: 'en', parameters: [] }, nil)

    expect(service.perform_batch(0)).to be_nil
  end

  it 'skips contacts with no phone number or WhatsApp identity' do
    contact.update!(phone_number: nil)
    expect(channel).not_to receive(:send_template)

    service.perform_batch(0)

    expect(Rails.logger).to have_received(:warn).with(/Phone number and BSUID are missing/)
  end

  context 'without template parameters' do
    let(:template_params) { nil }

    it 'skips every contact' do
      expect(channel).not_to receive(:send_template)

      service.perform_batch(0)

      expect(Rails.logger).to have_received(:error).with(/no template_params found/)
    end
  end

  it 'skips contacts whose template variables cannot be resolved' do
    allow(Whatsapp::LiquidTemplateProcessorService).to receive(:new).and_raise(StandardError, 'bad liquid')
    expect(channel).not_to receive(:send_template)

    service.perform_batch(0)

    expect(Rails.logger).to have_received(:error).with(/Failed to process liquid template params .*bad liquid/)
  end

  it 'skips authentication templates the guard blocks' do
    allow(Whatsapp::AuthenticationTemplateGuard).to receive(:new)
      .and_return(instance_double(Whatsapp::AuthenticationTemplateGuard, error: 'BSUID cannot receive OTP'))
    expect(channel).not_to receive(:send_template)

    service.perform_batch(0)

    expect(Rails.logger).to have_received(:warn).with('Skipping BSUID campaign recipient: BSUID cannot receive OTP')
  end

  it 'does not send when the template cannot be found' do
    allow(Whatsapp::TemplateProcessorService).to receive(:new)
      .and_return(instance_double(Whatsapp::TemplateProcessorService, call: [nil, nil, nil, nil]))
    expect(channel).not_to receive(:send_template)

    service.perform_batch(0)
  end

  it 'logs a failed send and carries on' do
    other = create(:contact, :with_phone_number, account: account).tap { |c| c.update_labels([label.title]) }
    allow(channel).to receive(:send_template).with(contact.phone_number, anything, nil).and_raise(StandardError, 'rate limited')
    expect(channel).to receive(:send_template).with(other.phone_number, anything, nil)

    service.perform_batch(0)

    expect(Rails.logger).to have_received(:error).with(/Failed to send WhatsApp template message to .*rate limited/)
  end
end
