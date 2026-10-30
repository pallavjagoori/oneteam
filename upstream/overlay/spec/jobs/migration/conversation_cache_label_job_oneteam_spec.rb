require 'rails_helper'

# OneTeam coverage for rebuilding each conversation's cached label list
# (used for fast label filtering) from its labels, in batches of 100.
RSpec.describe Migration::ConversationCacheLabelJob do
  include ActiveJob::TestHelper

  it 'rebuilds the cached label list of every conversation in the account' do
    account = create(:account)
    conversation = create(:conversation, account: account)
    conversation.update!(label_list: %w[billing refund])
    conversation.update_column(:cached_label_list, nil) # rubocop:disable Rails/SkipsModelValidations

    perform_enqueued_jobs { described_class.perform_later(account) }

    expect(conversation.reload.cached_label_list.split(', ')).to contain_exactly('billing', 'refund')
  end
end
