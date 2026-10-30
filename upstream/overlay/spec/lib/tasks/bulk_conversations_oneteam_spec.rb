require 'rails_helper'

# OneTeam coverage for `rake conversations:generate_bulk`, a development-only
# task that fills an inbox with fake contacts and conversations.
RSpec.describe 'conversations:generate_bulk' do # rubocop:disable RSpec/DescribeClass
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }

  def generate(*)
    run_rake('conversations:generate_bulk', *)
  end

  it 'only runs in development' do
    expect(generate(1, account.id, inbox.id).status).to eq(1)
  end

  context 'when running in development' do
    before do
      allow(Rails.env).to receive(:development?).and_return(true)
      create(:user, account: account)
    end

    it 'creates conversations with messages' do
      result = generate(10, account.id, inbox.id)

      expect(inbox.conversations.count).to eq(10)
      expect(inbox.messages.where(message_type: :incoming)).to exist
      expect(result.output).to include('Created conversation 10/10', 'Successfully created: 10 conversations')
    end

    it 'reports conversations it could not create' do
      allow(ContactInboxBuilder).to receive(:new).and_raise(StandardError, 'no source id')

      expect(generate(1, account.id, inbox.id).output).to include('Error creating conversation 1: no source id', 'Successfully created: 0')
    end

    it 'checks the account and inbox' do
      expect(generate(1).output).to include('ACCOUNT_ID is required')
      expect(generate(1, account.id).output).to include('INBOX_ID is required')
      expect(generate(1, 0, inbox.id).output).to include('Account with ID 0 not found')
      expect(generate(1, account.id, 0).output).to include('Inbox with ID 0 not found')
      expect(generate(1, account.id, create(:inbox).id).output).to include("does not belong to Account #{account.id}")
    end
  end
end
