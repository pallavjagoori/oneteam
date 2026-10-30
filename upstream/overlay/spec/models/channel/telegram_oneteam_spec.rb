require 'rails_helper'

# OneTeam coverage for connecting a Telegram bot (the token is checked with
# getMe, which also gives the bot's name, and the webhook is reset to point
# at this install) and for reading a Telegram user's profile photo link.
RSpec.describe Channel::Telegram do
  let(:account) { create(:account) }
  let(:api) { 'https://api.telegram.org/bottok' }

  def telegram(path, status: 200, body: { ok: true, result: {} })
    stub_request(:any, "#{api}/#{path}").with(query: hash_including({}))
                                        .to_return(status: status, body: body.to_json, headers: { 'Content-Type' => 'application/json' })
  end

  describe 'connecting a bot' do
    before do
      telegram('deleteWebhook')
      telegram('setWebhook')
    end

    it 'takes the bot name from Telegram and points the webhook here' do
      telegram('getMe', body: { ok: true, result: { username: 'acme_bot' } })

      channel = described_class.create!(account: account, bot_token: 'tok')

      expect(channel.bot_name).to eq('acme_bot')
      expect(a_request(:post, "#{api}/setWebhook").with(body: hash_including('url' => %r{/webhooks/telegram/tok\z}))).to have_been_made
    end

    it 'rejects a token Telegram does not accept' do
      telegram('getMe', status: 401)

      channel = described_class.new(account: account, bot_token: 'tok')

      expect(channel).not_to be_valid
      expect(channel.errors[:bot_token]).to include('invalid token')
    end

    it 'fails to save when the webhook cannot be set' do
      telegram('getMe', body: { ok: true, result: { username: 'acme_bot' } })
      telegram('setWebhook', status: 500)

      channel = described_class.new(account: account, bot_token: 'tok')
      channel.save

      expect(channel.errors[:bot_token]).to include('error setting up the webook')
    end
  end

  describe '#get_telegram_profile_image' do
    let(:channel) { create(:channel_telegram, bot_token: 'tok') }

    it 'links to the largest size of the first profile photo' do
      telegram('getUserProfilePhotos', body: { ok: true, result: { photos: [[{ file_id: 'small' }, { file_id: 'big' }]] } })
      telegram('getFile', body: { ok: true, result: { file_path: 'photos/big.jpg' } })

      expect(channel.get_telegram_profile_image(42)).to eq('https://api.telegram.org/file/bottok/photos/big.jpg')
    end

    it 'returns nothing when the file lookup fails' do
      telegram('getFile', status: 400)

      expect(channel.get_telegram_file_path('missing')).to be_nil
    end
  end
end
