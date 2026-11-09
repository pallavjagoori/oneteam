require 'rails_helper'

# OneTeam coverage for a References header that cannot be built: the error
# is reported and the header left empty.
RSpec.describe ReferencesHeaderBuilder do
  it 'returns an empty header when building fails' do
    conversation = create(:conversation)
    host = Class.new { include ReferencesHeaderBuilder }.new
    allow(host).to receive(:get_references_from_replied_message).and_raise(StandardError, 'bad thread')
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)

    expect(host.build_references_header(conversation, '<m1@example.com>')).to eq('')
    expect(tracker).to have_received(:capture_exception)
  end
end
