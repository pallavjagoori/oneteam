require 'rails_helper'

# OneTeam coverage for Instagram story lookups through a Facebook page that
# fail: an expired token flags the channel, and other errors are reported.
describe Messages::Instagram::Messenger::MessageBuilder do
  let(:channel) { instance_double(Channel::FacebookPage, page_access_token: 'tok', authorization_error!: true) }
  let(:inbox) { instance_double(Inbox, channel: channel, facebook?: true, account: build(:account)) }
  let(:builder) { described_class.new({ sender: { id: '1' }, recipient: { id: '2' } }, inbox) }
  let(:api) { instance_double(Koala::Facebook::API) }

  before { allow(Koala::Facebook::API).to receive(:new).and_return(api) }

  it 'flags the channel and re-raises authentication errors' do
    allow(api).to receive(:get_object).and_raise(Koala::Facebook::AuthenticationError.new(401, 'expired'))

    expect { builder.send(:get_story_object_from_source_id, 'story-1') }.to raise_error(Koala::Facebook::AuthenticationError)
    expect(channel).to have_received(:authorization_error!)
  end

  it 'reports other errors and returns no story' do
    allow(api).to receive(:get_object).and_raise(Faraday::ConnectionFailed, 'reset')
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)

    expect(builder.send(:get_story_object_from_source_id, 'story-1')).to eq({})
    expect(tracker).to have_received(:capture_exception)
  end
end
