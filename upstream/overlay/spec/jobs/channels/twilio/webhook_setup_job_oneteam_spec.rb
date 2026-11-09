require 'rails_helper'

# OneTeam coverage: the job hands the Twilio channel to the webhook setup service.
RSpec.describe Channels::Twilio::WebhookSetupJob do
  it 'runs the webhook setup service for the channel' do
    channel = create(:channel_twilio_sms)
    service = instance_double(Twilio::WebhookSetupService, perform: true)
    allow(Twilio::WebhookSetupService).to receive(:new).with(channel: channel).and_return(service)

    described_class.perform_now(channel)

    expect(service).to have_received(:perform)
  end
end
