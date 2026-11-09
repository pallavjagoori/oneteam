# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a failure while creating the template message is reported, not raised.
RSpec.describe MessageTemplates::Template::OutOfOffice do
  it 'reports a failure to the exception tracker' do
    conversation = create(:conversation)
    allow(conversation).to receive(:messages).and_raise(StandardError, 'boom')
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)

    expect(described_class.new(conversation: conversation).perform).to be(true)
    expect(tracker).to have_received(:capture_exception)
  end
end
