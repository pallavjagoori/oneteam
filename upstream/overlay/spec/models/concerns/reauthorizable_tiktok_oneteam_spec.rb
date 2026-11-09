require 'rails_helper'

RSpec.describe Reauthorizable do
  it 'sends the TikTok disconnect email for TikTok channels' do
    hook = create(:integrations_hook)
    channel = instance_double(Channel::Tiktok, send_channel_reauthorization_email: true)

    hook.send(:reauthorization_handlers)['Channel::Tiktok'].call(channel)

    expect(channel).to have_received(:send_channel_reauthorization_email).with(:tiktok_disconnect)
  end
end
