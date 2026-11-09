require 'rails_helper'

RSpec.describe TwitterConcern do
  let(:host_class) do
    Class.new do
      include TwitterConcern

      public :host, :twitter_client
    end
  end

  it 'uses the frontend URL as host' do
    with_modified_env FRONTEND_URL: 'https://app.example.com' do
      expect(host_class.new.host).to eq('https://app.example.com')
    end
  end

  it 'builds a Twitty client from the environment' do
    with_modified_env TWITTER_CONSUMER_KEY: 'key', TWITTER_CONSUMER_SECRET: 'secret', TWITTER_ENVIRONMENT: 'dev' do
      expect(host_class.new.twitter_client).to be_a(Twitty::Facade)
    end
  end
end
