require 'rails_helper'

RSpec.describe Api::V1::Accounts::InboxesController do
  let(:controller_instance) { described_class.new }

  def use_inbox(inbox, params = {})
    controller_instance.instance_variable_set(:@inbox, inbox)
    allow(controller_instance).to receive(:params).and_return(ActionController::Parameters.new(params))
    allow(controller_instance).to receive(:render)
    allow(controller_instance).to receive(:head)
  end

  it 'removes the agent bot when none is given' do
    inbox = create(:inbox)
    create(:agent_bot_inbox, inbox: inbox, agent_bot: create(:agent_bot))
    use_inbox(inbox)

    controller_instance.set_agent_bot

    expect(inbox.reload.agent_bot_inbox).to be_nil
  end

  it 'renders the email validation error' do
    use_inbox(create(:inbox))
    allow(controller_instance).to receive(:validate_email_channel).and_raise(StandardError, 'imap down')

    controller_instance.send(:validate_and_update_email_channel, [])

    expect(controller_instance).to have_received(:render).with(json: { message: kind_of(StandardError) }, status: :unprocessable_entity)
  end

  it 'saves the selected widget feature flags' do
    inbox = create(:channel_widget).inbox
    use_inbox(inbox, channel: { selected_feature_flags: ['attachments'] })

    controller_instance.send(:update_channel_feature_flags)

    expect(inbox.channel.reload.selected_feature_flags).to eq([:attachments])
  end

  describe 'health management helpers' do
    it 'renders the webhook registration error' do
      use_inbox(create(:inbox))
      allow(controller_instance).to receive(:register_channel_webhook).and_raise(StandardError, 'graph down')

      controller_instance.register_webhook

      expect(controller_instance).to have_received(:render).with(json: { error: 'graph down' }, status: :unprocessable_entity)
    end

    it 'reads content templates for Twilio WhatsApp inboxes' do
      synced_at = Time.current
      channel = instance_double(Channel::TwilioSms, content_templates: { 'templates' => [{ 'friendly_name' => 'hi' }] },
                                                    content_templates_last_updated: synced_at)
      use_inbox(instance_double(Inbox, twilio_whatsapp?: true, channel: channel))

      expect(controller_instance.send(:message_template_data)).to eq([[{ 'friendly_name' => 'hi' }], synced_at, 'friendly_name'])
    end

    it 'queues a Twilio template sync for Twilio WhatsApp inboxes' do
      channel = instance_double(Channel::TwilioSms, whatsapp?: true)
      use_inbox(instance_double(Inbox, whatsapp?: false, twilio?: true, channel: channel))
      allow(Channels::Twilio::TemplatesSyncJob).to receive(:perform_later)

      controller_instance.send(:trigger_template_sync)

      expect(Channels::Twilio::TemplatesSyncJob).to have_received(:perform_later).with(channel)
    end
  end
end
