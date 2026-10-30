require 'rails_helper'

# OneTeam coverage for the helpers TikTok's message services share: making
# the contact for a TikTok conversation, finding the open (or, with one
# conversation per contact, the latest) Chatwoot conversation, matching a
# TikTok message to the right conversation and downloading attachments.
describe Tiktok::MessagingHelpers do
  let(:helper) { Class.new { include Tiktok::MessagingHelpers }.new }
  let(:channel) { create(:channel_tiktok) }
  let(:inbox) { channel.inbox }

  def call(name, *)
    helper.send(name, *)
  end

  it 'creates a contact named after the TikTok user' do
    contact_inbox = call(:create_contact_inbox, channel, 'tt-conv', 'jane', 'tt-user')

    expect(contact_inbox.source_id).to eq('tt-conv')
    expect(contact_inbox.contact).to have_attributes(name: 'jane')
    expect(contact_inbox.contact.additional_attributes).to include('social_tiktok_user_id' => 'tt-user', 'username' => 'jane')
  end

  describe 'finding the conversation' do
    let(:contact_inbox) { create(:contact_inbox, inbox: inbox, source_id: 'tt-conv') }
    let!(:resolved) { create(:conversation, inbox: inbox, contact_inbox: contact_inbox, contact: contact_inbox.contact, status: :resolved) }

    it 'returns nothing for an unknown TikTok conversation' do
      expect(call(:find_conversation, channel, 'other')).to be_nil
    end

    it 'falls back to the latest resolved conversation' do
      expect(call(:find_conversation, channel, 'tt-conv')).to eq(resolved)
    end

    it 'uses the latest conversation when the inbox keeps one per contact' do
      inbox.update!(lock_to_single_conversation: true)

      expect(call(:find_conversation, channel, 'tt-conv')).to eq(resolved)
    end
  end

  it 'matches a TikTok message only within its own conversation' do
    conversation = create(:conversation, inbox: inbox, additional_attributes: { conversation_id: 'tt-conv' })
    message = create(:message, conversation: conversation, source_id: 'tt-msg')

    expect(call(:find_message, 'tt-conv', 'tt-msg')).to eq(message)
    expect(call(:find_message, 'other-conv', 'tt-msg')).to be_nil
  end

  it 'downloads an attachment with the channel token' do
    allow(Tiktok::Client).to receive(:new).and_return(instance_double(Tiktok::Client, file_download_url: 'https://cdn.tiktok.com/img'))
    expect(Down).to receive(:download).with('https://cdn.tiktok.com/img', headers: { 'x-user' => channel.access_token }).and_return(:file)

    expect(call(:fetch_attachment, channel, 'tt-conv', 'tt-msg', 'img')).to eq(:file)
  end
end
