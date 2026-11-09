require 'rails_helper'

# OneTeam coverage for unexpected playground errors: they are reported and
# the playground gets a generic error.
RSpec.describe Captain::Playground::ResponseJob do
  it 'reports unexpected errors' do
    account = create(:account)
    assistant = create(:captain_assistant, account: account)
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
    job = described_class.new
    allow(job).to receive(:generate_response).and_raise(StandardError, 'boom')

    payload = job.send(:response_payload, assistant: assistant, message_content: 'hi', message_history: [],
                                          playground_config: nil, playground_config_supplied: false)

    expect(payload).to eq(error: true)
    expect(tracker).to have_received(:capture_exception)
  end
end
