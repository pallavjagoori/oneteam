require 'rails_helper'

# OneTeam coverage for the community edition's message translation provider.
# Without Captain, translations always come from Google Translate; the
# enterprise module replaces this method in Chatwoot's suite.
RSpec.describe Api::V1::Accounts::Conversations::MessagesController do
  it 'records Google Translate as the provider in the community edition' do
    controller = community_edition_of(described_class, :translation_provider).new

    expect(controller.send(:translation_provider)).to eq('google_translate')
  end
end
