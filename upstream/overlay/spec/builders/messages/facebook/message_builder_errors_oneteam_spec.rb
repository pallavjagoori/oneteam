require 'rails_helper'

# OneTeam coverage for Facebook messages whose sender profile cannot be
# fetched (Graph API errors other than "no profile", or anything unexpected),
# unexpected errors while saving, and shared locations.
describe Messages::Facebook::MessageBuilder do
  let(:facebook_channel) { create(:channel_facebook_page) }
  let(:incoming) { Integrations::Facebook::MessageParser.new(build(:incoming_fb_text_message).to_json) }
  let(:builder) { described_class.new(incoming, facebook_channel.inbox) }
  let(:fb_api) { instance_double(Koala::Facebook::API) }
  let(:tracker) { instance_double(ChatwootExceptionTracker, capture_exception: true) }

  before do
    stub_request(:post, /graph.facebook.com/)
    allow(Koala::Facebook::API).to receive(:new).and_return(fb_api)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
  end

  it 'reports Graph API errors and names the contact John Doe' do
    allow(fb_api).to receive(:get_object).and_raise(Koala::Facebook::ClientError.new(400, '{"error":{"message":"(#4) rate limit"}}'))

    builder.perform

    expect(facebook_channel.inbox.contacts.first.name).to eq('John Doe')
    expect(tracker).to have_received(:capture_exception)
  end

  it 'reports unexpected profile errors' do
    allow(fb_api).to receive(:get_object).and_raise(Faraday::ConnectionFailed, 'reset')

    builder.perform

    expect(facebook_channel.inbox.contacts.first.name).to eq('John Doe')
  end

  it 'reports unexpected errors while saving the message' do
    allow(fb_api).to receive(:get_object).and_return({ 'name' => 'Jane' })
    allow(builder).to receive(:build_message).and_raise(ActiveRecord::StatementInvalid, 'boom')

    expect(builder.perform).to be(true)
    expect(tracker).to have_received(:capture_exception)
  end

  it 'reads shared locations' do
    attachment = { 'url' => 'https://maps.example/x', 'title' => 'Office', 'payload' => { 'coordinates' => { 'lat' => 1.5, 'long' => 2.5 } } }

    expect(builder.send(:location_params, attachment))
      .to eq(external_url: 'https://maps.example/x', coordinates_lat: 1.5, coordinates_long: 2.5, fallback_title: 'Office')
  end
end
