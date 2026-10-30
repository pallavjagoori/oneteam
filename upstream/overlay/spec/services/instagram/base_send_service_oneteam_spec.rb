require 'rails_helper'

# OneTeam coverage for the shared Instagram sending flow: send errors are
# reported rather than raised, unknown attachment kinds go out as files, and
# subclasses must supply the API call and the human-agent tag.
RSpec.describe Instagram::BaseSendService do
  let(:message) { create(:message, message_type: :outgoing, content: 'hello') }
  let(:service) { described_class.new(message: message) }

  it 'reports send errors' do
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
    allow(service).to receive(:send_content).and_raise(StandardError, 'graph down')

    service.send(:perform_reply)

    expect(tracker).to have_received(:capture_exception)
  end

  it 'sends unknown attachment kinds as files' do
    expect(service.send(:attachment_type, instance_double(Attachment, file_type: 'location'))).to eq('file')
  end

  it 'leaves the API call and agent tag to subclasses' do
    expect { service.send(:send_message, {}) }.to raise_error(NotImplementedError)
    expect { service.send(:merge_human_agent_tag, {}) }.to raise_error(NotImplementedError)
  end
end
