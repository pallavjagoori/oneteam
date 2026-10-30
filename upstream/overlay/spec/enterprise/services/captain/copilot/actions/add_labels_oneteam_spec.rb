require 'rails_helper'

# OneTeam coverage for the only change Copilot can make today: adding
# existing labels to conversations, after the agent approves it. Arguments
# are checked against a JSON schema and the account's labels up front.
RSpec.describe Captain::Copilot::Actions::AddLabels do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account) }

  before do
    create(:label, account: account, title: 'billing')
    create(:label, account: account, title: 'vip')
  end

  def build(arguments)
    Captain::Copilot::Actions.build('add_labels', account: account, user: user, arguments: arguments)
  end

  it 'adds the labels a conversation is missing' do
    conversation = create(:conversation, account: account)
    conversation.update!(label_list: ['vip'])

    expect(build(labels: %w[billing vip]).perform(conversation)).to eq(:applied)
    expect(conversation.reload.label_list).to contain_exactly('billing', 'vip')
  end

  it 'skips a conversation that already has them' do
    conversation = create(:conversation, account: account)
    conversation.update!(label_list: ['billing'])

    expect(build('labels' => ['billing']).perform(conversation)).to eq(:skipped)
  end

  it 'rejects arguments outside the schema' do
    expect { build(labels: []) }.to raise_error(ArgumentError, 'Invalid arguments for add_labels')
    expect { build(labels: ['vip'], color: 'red') }.to raise_error(ArgumentError, 'Invalid arguments for add_labels')
    expect { build(:'not a hash') }.to raise_error(ArgumentError, 'Invalid arguments for add_labels')
  end

  it 'rejects labels the account does not have, listing the ones it has' do
    expect { build(labels: %w[vip urgent]) }.to raise_error(ArgumentError, 'Unknown labels: urgent. Available labels: billing, vip')
  end

  it 'is the only action, and unknown actions are listed' do
    expect(Captain::Copilot::Actions.all).to eq([described_class])
    expect { Captain::Copilot::Actions.build('close', account: account, user: user, arguments: {}) }
      .to raise_error(ArgumentError, 'Unknown action close. Available actions: add_labels')
  end
end
