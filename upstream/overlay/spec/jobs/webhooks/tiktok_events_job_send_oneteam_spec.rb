# frozen_string_literal: true

require 'rails_helper'

# OneTeam: messages sent from the TikTok app come back as outgoing echoes.
RSpec.describe Webhooks::TiktokEventsJob do
  let(:account) { create(:account) }
  let!(:channel) { create(:channel_tiktok, account: account, business_id: 'biz-123') }
  let(:job) { described_class.new }

  it 'stores im_send_msg events as outgoing echoes' do
    allow(job).to receive(:with_lock).and_yield
    message_service = instance_double(Tiktok::MessageService, perform: true)
    allow(Tiktok::MessageService).to receive(:new).and_return(message_service)

    job.perform(event: 'im_send_msg', user_openid: 'biz-123', content: { conversation_id: 'tt-conv-1' }.to_json)

    expect(Tiktok::MessageService).to have_received(:new)
      .with(channel: channel, content: hash_including(conversation_id: 'tt-conv-1'), outgoing_echo: true)
    expect(message_service).to have_received(:perform)
  end
end
