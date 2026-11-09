require 'rails_helper'

# OneTeam coverage for transcription requests the provider rejects: the job
# is discarded with a warning.
RSpec.describe Messages::AudioTranscriptionJob do
  include ActiveJob::TestHelper

  it 'discards the job on a bad request' do
    allow(Attachment).to receive(:find_by).with(id: 42).and_return(instance_double(Attachment))
    service = instance_double(Messages::AudioTranscriptionService)
    allow(Messages::AudioTranscriptionService).to receive(:new).and_return(service)
    allow(service).to receive(:perform).and_raise(Faraday::BadRequestError.new('bad', { status: 400 }))
    allow(Rails.logger).to receive(:warn)

    expect { perform_enqueued_jobs { described_class.perform_later(42) } }.not_to raise_error
    expect(Rails.logger).to have_received(:warn).with(/Discarding audio transcription job due to bad request/)
  end
end
