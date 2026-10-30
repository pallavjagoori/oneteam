require 'rails_helper'

# OneTeam coverage for `rake search:setup_test_data`, a developer task that
# fills the first account with API, widget and email inboxes and 50,000
# messages to try advanced search on. Message saving is stubbed so the spec
# stays fast; conversations and contacts are real.
RSpec.describe 'search:setup_test_data' do # rubocop:disable RSpec/DescribeClass
  it 'needs an account' do
    result = run_rake('search:setup_test_data')

    expect(result.output).to include('No account found')
    expect(result.status).to eq(1)
  end

  it 'needs agents' do
    create(:account)

    expect(run_rake('search:setup_test_data').output).to include('No agents found')
  end

  it 'creates inboxes, contacts and conversations full of messages' do
    account = create(:account)
    create(:user, account: account)
    attempts = 0
    allow(Message).to receive(:create!) do
      attempts += 1
      raise ActiveRecord::RecordInvalid if attempts <= 6
    end

    output = run_rake('search:setup_test_data').output

    expect(account.inboxes.pluck(:channel_type)).to contain_exactly('Channel::Api', 'Channel::WebWidget', 'Channel::Email')
    expect(account.contacts.count).to eq(10)
    expect(account.conversations.count).to eq(498)
    expect(output).to include('Failed to create message', 'Successfully created 49794 messages!', 'Failed: 6', 'Breakdown by inbox')
  end
end
