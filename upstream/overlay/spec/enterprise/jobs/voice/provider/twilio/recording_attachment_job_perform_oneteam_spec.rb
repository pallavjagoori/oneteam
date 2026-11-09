require 'rails_helper'

# OneTeam coverage for attaching a Twilio call recording.
RSpec.describe Voice::Provider::Twilio::RecordingAttachmentJob do
  it 'skips calls that no longer exist' do
    allow(Voice::Provider::Twilio::RecordingAttachmentService).to receive(:new)

    described_class.new.perform(0, 'RE1', 'https://api.twilio.com/rec')

    expect(Voice::Provider::Twilio::RecordingAttachmentService).not_to have_received(:new)
  end

  it 'hands the recording to the attachment service' do
    call = instance_double(Call)
    allow(Call).to receive(:find_by).with(id: 5).and_return(call)
    service = instance_double(Voice::Provider::Twilio::RecordingAttachmentService, perform: true)
    allow(Voice::Provider::Twilio::RecordingAttachmentService).to receive(:new).and_return(service)

    described_class.new.perform(5, 'RE1', 'https://api.twilio.com/rec', 12)

    expect(service).to have_received(:perform)
  end
end
