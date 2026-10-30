require 'rails_helper'

# OneTeam coverage for transcribing a call recording in the background: a
# deleted call is skipped, and a recording or API key OpenAI rejects is
# dropped (logged, not retried).
RSpec.describe Voice::CallTranscriptionJob do
  let(:transcription) { instance_double(Voice::CallTranscriptionService, perform: true) }
  let(:call) { instance_double(Call) }

  before do
    allow(Call).to receive(:find_by).and_return(nil)
    allow(Call).to receive(:find_by).with(id: 42).and_return(call)
    allow(Voice::CallTranscriptionService).to receive(:new).and_return(transcription)
  end

  it 'transcribes the call' do
    described_class.perform_now(42)

    expect(Voice::CallTranscriptionService).to have_received(:new).with(call: call)
  end

  it 'skips a call that no longer exists' do
    described_class.perform_now(7)

    expect(Voice::CallTranscriptionService).not_to have_received(:new)
  end

  it 'drops a recording OpenAI rejects' do
    allow(transcription).to receive(:perform).and_raise(Faraday::BadRequestError.new('bad audio', { status: 400 }))
    allow(Rails.logger).to receive(:warn)

    expect { described_class.perform_now(42) }.not_to raise_error
    expect(Rails.logger).to have_received(:warn).with(/Discarding call transcription job: .*call_id.*42.*status_code.*400/)
  end
end
