require 'rails_helper'

# OneTeam coverage for the tables Copilot's display tool shows: a saved
# collection page by page, or a review's findings with matched ones first.
# Rows only include records the agent can still open, and cell text is
# escaped so it cannot break the Markdown table.
RSpec.describe Captain::Copilot::ResultTable do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:turn) { start_copilot_turn(account: account, user: admin) }
  let(:conversations) { create_list(:conversation, 3, account: account) }

  it 'checks the page arguments' do
    table = described_class.new(copilot_collection(turn, []))

    expect { table.page(0) }.to raise_error(ArgumentError, 'page must be a positive integer')
    expect { table.page('1') }.to raise_error(ArgumentError, 'page must be a positive integer')
    expect { table.page(1, matched_only: 'yes') }.to raise_error(ArgumentError, 'matched_only must be a boolean')
  end

  describe 'a collection' do
    let(:collection) { copilot_collection(turn, conversations.map(&:id), filters: { 'status' => 'open' }, truncated: true) }

    it 'shows a page of linked rows with the filters and cut-off warning' do
      stub_const('Captain::Copilot::ResultTable::PAGE_SIZE', 2)
      conversations.first.update!(label_list: ['vip_customer'])

      page = described_class.new(collection).page(1)

      expect(page).to include(type: 'table', page: 1, total: 3, has_more: true)
      # Cells are HTML-escaped as well as Markdown-escaped, so the filters reach the model as &quot; (see FINDINGS.md).
      display_id = conversations.first.display_id
      expect(page[:content]).to include("Collection ##{collection.id}: 3 conversations.", 'Filters: {&quot;status&quot;:&quot;open&quot;}.',
                                        'The selection limit was reached.', '| Conversation | Status | Labels | Last activity |',
                                        "[##{display_id}](/app/accounts/#{account.id}/conversations/#{display_id})",
                                        'vip\\_customer', 'Page 1 of 3 conversations.')
    end

    it 'says when a page has no rows' do
      page = described_class.new(collection).page(5)

      expect(page).to include(has_more: false)
      expect(page[:content]).to end_with('No records on this page.')
    end
  end

  describe 'a review' do
    let(:review) { copilot_review(turn, copilot_collection(turn, conversations.map(&:id)), question: 'Refund?') }

    before do
      review.findings.create!(conversation_id: conversations[0].id, status: :reviewed, matched: false, category: 'other', reason: 'Shipping | delay')
      review.findings.create!(conversation_id: conversations[1].id, status: :reviewed, matched: true, category: 'refund', reason: 'Wants *money*')
      review.findings.create!(conversation_id: conversations[2].id, status: :failed, error: 'Timeout')
    end

    it 'lists matched findings first, with coverage' do
      review.update!(status: :incomplete)

      content = described_class.new(review).page(1)[:content]

      expect(content).to include("Review ##{review.id}: incomplete. Processed 3 of 3: 0 screened out, 2 reviewed, 1 matched, 1 failed.",
                                 'Screening question: Refund?', '| Conversation | Matched | Category | Finding |',
                                 'Wants \\*money\\*', 'Shipping \\| delay', 'Not reviewed: Timeout', 'Findings 1 to 3 of 3 accessible findings')
      expect(content.index('Wants')).to be < content.index('Shipping')
    end

    it 'shows only matched findings when asked' do
      content = described_class.new(review).page(1, matched_only: true)[:content]

      expect(content).to include('| Conversation | Category | Finding |', 'Wants')
      expect(content).not_to include('Shipping')
    end

    it 'points to later pages and leaves out conversations the agent cannot open' do
      stub_const('Captain::Copilot::ResultTable::REVIEW_PAGE_SIZE', 1)
      agent = create(:user, account: account, role: :agent)
      create(:inbox_member, user: agent, inbox: conversations[1].inbox)
      agent_turn = start_copilot_turn(account: account, user: agent)
      agent_review = copilot_review(agent_turn, copilot_collection(agent_turn, conversations.map(&:id)))
      conversations.each do |conversation|
        agent_review.findings.create!(conversation_id: conversation.id, status: :reviewed, matched: true, category: 'c', reason: 'r')
      end

      page = described_class.new(agent_review).page(1)

      expect(page[:total]).to eq(1)
      expect(page[:content]).to include('Findings 1 to 1 of 1')
    end

    it 'flags a finished review with conversations left, a cut selection and a stop reason' do
      review.findings.where(conversation_id: conversations[2].id).delete_all
      review.source_run.update!(context: review.source_run.context.merge('selection_truncated' => true))
      review.update!(status: :incomplete, error: 'Credits ran out')

      content = described_class.new(review).page(1)[:content]

      expect(content).to include('1 conversations are not reviewed yet. Ask to continue the review.',
                                 'The selection limit was reached.', 'Execution stopped: Credits ran out.')
    end

    it 'shows an empty page and a blank cell for findings still waiting' do
      review.findings.update_all(status: 'awaiting_retry', matched: false) # rubocop:disable Rails/SkipsModelValidations

      expect(described_class.new(review).page(2)[:content]).to end_with('No saved findings on this page.')
      expect(described_class.new(review).page(1)[:content]).to include('|  | ')
    end

    it 'says how many findings are on later pages' do
      stub_const('Captain::Copilot::ResultTable::REVIEW_PAGE_SIZE', 2)

      expect(described_class.new(review).page(1)[:content]).to include('1 more are on later pages. Ask for page 2 to read them.')
    end
  end
end
