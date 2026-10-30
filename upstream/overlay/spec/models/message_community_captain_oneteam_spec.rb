require 'rails_helper'

# OneTeam coverage for Message methods the enterprise edition replaces:
# without Captain no conversation waits on a bot, so replies never reopen it.
RSpec.describe Message do
  it 'leaves the conversation alone in the community edition' do
    message = create(:message, message_type: :outgoing)
    community = community_edition_of(described_class, :mark_pending_conversation_as_open_for_human_response,
                                     :captain_pending_conversation?).find(message.id)

    expect(community.send(:mark_pending_conversation_as_open_for_human_response)).to be_nil
  end

  it 'uses the Facebook page token as the channel token' do
    stub_request(:any, /graph\.facebook\.com/)
    channel = create(:channel_facebook_page)
    message = create(:message, inbox: channel.inbox)

    expect(message.channel_token).to eq(channel.page_access_token)
  end
end
