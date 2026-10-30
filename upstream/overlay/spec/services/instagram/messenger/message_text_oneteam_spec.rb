require 'rails_helper'

# OneTeam coverage for looking up an Instagram sender through a Facebook
# page. A revoked page token counts towards asking for reauthorisation; Meta's
# "consent required" (230) and "no such user" (9010) errors are expected
# and only logged; any other error is also reported to error tracking.
describe Instagram::Messenger::MessageText do
  let(:channel) { create(:channel_facebook_page) }
  let(:service) { described_class.new({ sender: { id: 'ig-1' }, recipient: { id: channel.instagram_id } }.with_indifferent_access, channel) }
  let(:graph) { instance_double(Koala::Facebook::API) }
  let(:tracker) { instance_double(ChatwootExceptionTracker, capture_exception: true) }

  before do
    # Creating a page channel subscribes it to Messenger webhooks.
    stub_request(:post, %r{graph\.facebook\.com/.+/subscribed_apps}).to_return(status: 200)
    allow(Koala::Facebook::API).to receive(:new).with(channel.page_access_token).and_return(graph)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
    allow(Rails.logger).to receive(:warn)
  end

  # perform finds the inbox from the webhook before looking up the sender.
  def lookup
    service.instance_variable_set(:@inbox, channel.inbox)
    service.send(:fetch_instagram_user, 'ig-1')
  end

  it 'returns the Instagram profile' do
    allow(graph).to receive(:get_object).with('ig-1').and_return('name' => 'Jane')

    expect(lookup).to eq('name' => 'Jane')
  end

  it 'counts an authorisation error when the page token is revoked' do
    allow(graph).to receive(:get_object).and_raise(Koala::Facebook::AuthenticationError.new(401, 'expired'))

    expect(lookup).to eq({})
    expect(channel.authorization_error_count).to eq(1)
    expect(tracker).to have_received(:capture_exception)
  end

  it 'only logs consent-required and unknown-user errors' do
    allow(graph).to receive(:get_object).and_raise(Koala::Facebook::ClientError.new(400, 'code 230 consent'))
    expect(lookup).to eq({})

    allow(graph).to receive(:get_object).and_raise(Koala::Facebook::ClientError.new(400, 'code 9010 no user'))
    expect(lookup).to eq({})

    expect(Rails.logger).to have_received(:warn).with(/\[Instagram User Not Found\]: account_id/)
    expect(tracker).not_to have_received(:capture_exception)
  end

  it 'reports other errors' do
    allow(graph).to receive(:get_object).and_raise(StandardError, 'timeout')

    expect(lookup).to eq({})
    expect(Rails.logger).to have_received(:warn).with('[FacebookUserFetchClientError]: timeout')
    expect(tracker).to have_received(:capture_exception)
  end
end
