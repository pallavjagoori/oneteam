require 'rails_helper'

# OneTeam coverage for WhatsApp campaign templates whose name cannot be
# resolved: the recipient is skipped and nothing is sent.
RSpec.describe Enterprise::Whatsapp::OneoffCampaignService do
  it 'skips the recipient when the template name is blank' do
    service = Whatsapp::OneoffCampaignService.new(campaign: instance_double(Campaign))
    channel = instance_double(Channel::Whatsapp)
    processor = instance_double(Whatsapp::TemplateProcessorService, call: [nil, nil, nil, nil])
    recipient = instance_double(CampaignRecipient, mark_skipped!: true)
    allow(service).to receive_messages(channel: channel, authentication_template_blocked?: false)
    allow(Whatsapp::TemplateProcessorService).to receive(:new).and_return(processor)
    allow(channel).to receive(:send_template)

    service.send(:send_whatsapp_template_message, recipient: recipient, to: '+15550001111', template_params: {})

    expect(recipient).to have_received(:mark_skipped!).with('Template name could not be resolved')
    expect(channel).not_to have_received(:send_template)
  end
end
