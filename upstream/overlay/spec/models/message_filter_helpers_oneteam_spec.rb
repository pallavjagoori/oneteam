# frozen_string_literal: true

require 'rails_helper'

# OneTeam: Slack receives incoming, outgoing and template messages, and
# Instagram story mentions are recognised.
RSpec.describe Message do
  it 'sends templates to Slack but not activities' do
    expect(build(:message, message_type: :template).slack_hook_sendable?).to be(true)
    expect(build(:message, message_type: :activity).slack_hook_sendable?).to be(false)
  end

  it 'detects an Instagram story mention' do
    message = build(:message, content_attributes: { image_type: 'story_mention' })
    allow(message.inbox).to receive(:instagram?).and_return(true)

    expect(message.instagram_story_mention?).to be(true)
  end
end
