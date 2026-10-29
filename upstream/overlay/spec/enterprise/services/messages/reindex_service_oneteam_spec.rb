require 'rails_helper'

# OneTeam coverage: an account's messages are reindexed in the background,
# but only when advanced search is available.
RSpec.describe Messages::ReindexService do
  let(:account) { create(:account) }
  # Searchkick adds `reindex` to relations through method_missing, so a
  # verified double cannot see it.
  let(:messages) { double('messages', reindex: true) } # rubocop:disable RSpec/VerifiedDoubles

  before { allow(account).to receive(:messages).and_return(messages) }

  it 'reindexes the messages asynchronously' do
    allow(ChatwootApp).to receive(:advanced_search_allowed?).and_return(true)

    described_class.new(account: account).perform

    expect(messages).to have_received(:reindex).with(mode: :async)
  end

  it 'does nothing without advanced search' do
    allow(ChatwootApp).to receive(:advanced_search_allowed?).and_return(false)

    described_class.new(account: account).perform

    expect(messages).not_to have_received(:reindex)
  end
end
