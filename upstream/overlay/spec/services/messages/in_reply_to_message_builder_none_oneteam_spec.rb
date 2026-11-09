# frozen_string_literal: true

require 'rails_helper'

# OneTeam: with no reply reference there is no replied-to message.
RSpec.describe Messages::InReplyToMessageBuilder do
  it 'finds no message without a reply id or external id' do
    builder = described_class.new(message: build(:message), in_reply_to: nil, in_reply_to_external_id: nil)

    expect(builder.send(:in_reply_to_message)).to be_nil
  end
end
