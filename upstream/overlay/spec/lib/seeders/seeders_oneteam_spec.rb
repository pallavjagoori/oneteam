require 'rails_helper'

# OneTeam coverage for the demo data seeders: the sample account (teams,
# users, labels, canned responses, one inbox per channel, contacts and
# conversations), the sample rich messages used by db/seeds.rb, and the
# reports seeder, shrunk here to a handful of records per kind.
RSpec.describe 'Seeders' do
  let(:account) { create(:account) }

  before do
    stub_request(:any, /graph\.facebook\.com|api\.telegram\.org|api\.line\.me|waba|xsgames/)
    allow(Avatar::AvatarFromUrlJob).to receive(:perform_later)
  end

  describe Seeders::AccountSeeder do
    it 'fills the account with sample data' do
      described_class.new(account: account).perform!
      account.reload

      expect(account.teams).to exist
      expect(account.labels).to exist
      expect(account.inboxes.pluck(:channel_type)).to include('Channel::WebWidget', 'Channel::Api', 'Channel::Telegram', 'Channel::Line')
      expect(account.conversations.joins(:messages)).to exist
      expect(account.canned_responses.count).to eq(50)
    end

    it 'is refused when seeding is turned off' do
      with_modified_env ENABLE_ACCOUNT_SEEDING: 'false' do
        expect { described_class.new(account: account) }.to raise_error('Account Seeding is not allowed.')
        expect { Seeders::InboxSeeder.new(account: account, company_data: {}) }.to raise_error(/not allowed/)
        expect { Seeders::Reports::ReportDataSeeder.new(account: account) }.to raise_error(/not allowed/)
      end
    end
  end

  describe Seeders::MessageSeeder do
    let(:conversation) { create(:conversation, account: account) }

    it 'creates each kind of sample rich message' do
      %i[create_sample_email_collect_message create_sample_csat_collect_message create_sample_cards_message
         create_sample_input_select_message create_sample_form_message create_sample_articles_message].each do |method|
        described_class.public_send(method, conversation)
      end

      expect(conversation.messages.pluck(:content_type)).to include('input_email', 'input_csat', 'cards', 'input_select', 'form', 'article')
    end
  end

  describe Seeders::Reports::ReportDataSeeder do
    before do
      {
        TOTAL_CONVERSATIONS: 3, TOTAL_CONTACTS: 3, TOTAL_AGENTS: 13, TOTAL_TEAMS: 2, TOTAL_LABELS: 2, TOTAL_INBOXES: 2,
        TOTAL_ASSISTANT_CONVERSATIONS: 20, ASSISTANT_KNOWLEDGE_APPROVED: 1, ASSISTANT_KNOWLEDGE_SUGGESTIONS: 1, ASSISTANT_DOCUMENTS: 1
      }.each { |name, value| stub_const("Seeders::Reports::ReportDataSeeder::#{name}", value) }
      stub_const('Seeders::Reports::MessageCreator::MESSAGES_PER_CONVERSATION', 1)
    end

    it 'creates report data with historical reporting events' do
      srand(42) # the seeder picks outcomes at random; a fixed seed keeps every branch exercised
      expect { described_class.new(account: account).perform! }.to output(/Completed reports data seeding/).to_stdout

      expect(account.conversations.count).to be >= 3
      expect(account.reporting_events).to exist
      expect(Captain::Assistant.for_account(account.id)).to exist
    end
  end
end
