require 'rails_helper'

# OneTeam coverage for Copilot's workflow tools as the model calls them:
# get_data, display, review_conversations, continue_review and act. Each
# works under the turn's lease and is offered only to agents who can manage
# conversations.
RSpec.describe 'Copilot workflow tools' do # rubocop:disable RSpec/DescribeClass
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:turn) { start_copilot_turn(account: account, user: admin, content: 'Label refund requests') }
  let(:conversations) { create_list(:conversation, 2, account: account) }
  let(:collection) { copilot_collection(turn, conversations.map(&:id)) }

  before { account.enable_features!('copilot_workflows') }

  describe Captain::Tools::Copilot::WorkflowTool do
    def tool_for(user)
      Captain::Tools::Copilot::DisplayService.new(turn.copilot_thread.assistant, run: turn, lease_token: 'token', user: user)
    end

    it 'is offered to agents who can manage conversations' do
      expect(tool_for(admin)).to be_active
      expect(tool_for(nil)).not_to be_active
    end

    it 'follows custom role permissions' do
      agent = create(:user, account: account, role: :agent)
      account_user = AccountUser.find_by(account: account, user: agent)

      account_user.update!(custom_role: create(:custom_role, account: account, permissions: ['report_manage']))
      expect(tool_for(agent)).not_to be_active

      account_user.update!(custom_role: create(:custom_role, account: account, permissions: ['conversation_participating_manage']))
      expect(tool_for(agent)).to be_active
    end
  end

  it 'get_data saves a collection' do
    conversations
    result = copilot_tool(Captain::Tools::Copilot::GetDataService, turn).execute(resource: 'conversations', filters: {})

    expect(result).to include(total: 2, resource: 'conversations')
  end

  it 'display shows a saved set' do
    result = copilot_tool(Captain::Tools::Copilot::DisplayService, turn).execute(saved_set_id: collection.id)

    expect(result).to include(type: 'table', total: 2)
  end

  describe Captain::Tools::Copilot::ReviewConversationsService do
    let(:tool) { copilot_tool(described_class, turn) }

    it 'starts a review of a conversation collection with the agent request' do
      result = tool.execute(collection_id: collection.id, criteria: 'Is it a refund?')

      review = CopilotRun::Review.find(result[:run_id])
      expect(review).to have_attributes(request: 'Label refund requests', criteria: 'Is it a refund?', source_run: collection)
      expect(review.context).to include('turn_start' => 0, 'turn_limit' => CopilotRun::CONVERSATIONS_PER_TURN)
      expect(Captain::Copilot::ReviewJob).to have_been_enqueued.with(review.id)
      expect(tool.execute(collection_id: collection.id, criteria: 'Is it a refund?')[:run_id]).to eq(review.id)
    end

    it 'screens with a question when Jev is available' do
      allow(Captain::Copilot::ScreeningService).to receive(:available?).and_return(true)

      result = tool.execute(collection_id: collection.id, criteria: 'Refund?', question: 'Money?')

      expect(result[:question]).to eq('Money?')
    end

    it 'refuses bad input' do
      allow(Captain::Copilot::ScreeningService).to receive(:available?).and_return(false)
      contacts = copilot_collection(turn, [1], resource: 'contacts')

      expect { tool.execute(collection_id: collection.id, criteria: '') }.to raise_error(ArgumentError, /Criteria must be a nonempty string/)
      expect { tool.execute(collection_id: collection.id, criteria: 'x' * 4001) }.to raise_error(ArgumentError, /at most 4000 characters/)
      expect { tool.execute(collection_id: collection.id, criteria: 'ok', question: 'x' * 501) }.to raise_error(ArgumentError, /Question must be/)
      expect { tool.execute(collection_id: collection.id, criteria: 'ok', question: 'Money?') }
        .to raise_error(ArgumentError, 'Screening is unavailable. Retry without question.')
      expect { tool.execute(collection_id: contacts.id, criteria: 'ok') }.to raise_error(ArgumentError, /Reviews read conversations/)
    end
  end

  it 'continue_review hands an unfinished review to this turn' do
    earlier = start_copilot_turn(account: account, user: admin, thread: turn.copilot_thread)
    review = copilot_review(earlier, collection, status: :incomplete)
    earlier.release!(:completed)

    result = copilot_tool(Captain::Tools::Copilot::ContinueReviewService, turn).execute(review_id: review.id)

    expect(result).to include(status: 'queued', remaining: 2)
    expect(Captain::Copilot::ReviewJob).to have_been_enqueued.with(review.id)
  end

  describe Captain::Tools::Copilot::ActService do
    let(:tool) { copilot_tool(described_class, turn) }

    before { create(:label, account: account, title: 'refund') }

    it 'proposes the change and schedules its expiry' do
      result = tool.execute(saved_set_id: collection.id, action: 'add_labels', arguments: { labels: ['refund'] })

      expect(result).to include(status: 'awaiting_approval', targets: 2)
      expect(Captain::Copilot::ApprovalExpiryJob).to have_been_enqueued.with(result[:run_id])
      expect(tool.execute(saved_set_id: collection.id, action: 'add_labels', arguments: { labels: ['refund'] })[:run_id]).to eq(result[:run_id])
    end

    it 'changes only the matched conversations of a review, unless told otherwise' do
      review = copilot_review(turn, collection, status: :completed)
      review.findings.create!(conversation_id: conversations.first.id, status: :reviewed, matched: true)
      review.findings.create!(conversation_id: conversations.last.id, status: :reviewed, matched: false)

      expect(tool.execute(saved_set_id: review.id, action: 'add_labels', arguments: { labels: ['refund'] })[:targets]).to eq(1)
      other = copilot_tool(described_class, turn)
      expect(other.execute(saved_set_id: review.id, action: 'add_labels', arguments: { labels: ['refund'] }, only_matched: false)[:targets]).to eq(2)
    end

    it 'refuses an empty, oversized or mismatched selection' do
      stub_const('Captain::Tools::Copilot::ActService::MAX_TARGETS', 1)

      expect { tool.execute(saved_set_id: copilot_collection(turn, []).id, action: 'add_labels', arguments: { labels: ['refund'] }) }
        .to raise_error(ArgumentError, 'There are no records to change')
      expect { tool.execute(saved_set_id: collection.id, action: 'add_labels', arguments: { labels: ['refund'] }) }
        .to raise_error(ArgumentError, /At most 1 records/)
      contacts = copilot_collection(turn, [1], resource: 'contacts')
      expect { tool.execute(saved_set_id: contacts.id, action: 'add_labels', arguments: { labels: ['refund'] }) }
        .to raise_error(ArgumentError, /This action changes conversations, but the source holds contacts/)
    end
  end
end
