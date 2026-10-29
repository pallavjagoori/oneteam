require 'rails_helper'

# OneTeam coverage for the Twitter (X) webhook endpoint. GET answers Twitter's
# challenge-response check (CRC) with an HMAC of the token; POST hands events
# to Webhooks::Twitter and always answers 200, so Twitter does not disable
# the webhook after an error on Chatwoot's side.
RSpec.describe 'Twitter webhooks API', type: :request do
  describe 'GET /webhooks/twitter' do
    it 'signs the CRC token with the consumer secret' do
      with_modified_env(TWITTER_CONSUMER_SECRET: 'consumer-secret') do
        get '/webhooks/twitter', params: { crc_token: 'challenge' }
      end

      digest = OpenSSL::HMAC.digest('sha256', 'consumer-secret', 'challenge')
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq('response_token' => "sha256=#{Base64.strict_encode64(digest)}")
    end
  end

  describe 'POST /webhooks/twitter' do
    let(:consumer) { instance_double(Webhooks::Twitter, consume: true) }

    before { allow(Webhooks::Twitter).to receive(:new).and_return(consumer) }

    it 'passes the event to the Twitter consumer' do
      post '/webhooks/twitter', params: { for_user_id: '1', direct_message_events: [] }, as: :json

      expect(response).to have_http_status(:ok)
      expect(consumer).to have_received(:consume)
    end

    it 'reports a failure and still answers 200' do
      allow(consumer).to receive(:consume).and_raise(StandardError, 'boom')
      tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
      allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)

      post '/webhooks/twitter', params: { for_user_id: '1' }, as: :json

      expect(response).to have_http_status(:ok)
      expect(tracker).to have_received(:capture_exception)
    end
  end
end
