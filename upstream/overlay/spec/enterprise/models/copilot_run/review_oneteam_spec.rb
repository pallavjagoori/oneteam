require 'rails_helper'

# OneTeam coverage for a Copilot review (CopilotRun::Review): it reads the
# selection of the collection it reviews, saves one finding per
# conversation, and can be continued by a later turn for what is left.
RSpec.describe CopilotRun::Review do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:turn) { start_copilot_turn(account: account, user: user) }
  let(:collection) { copilot_collection(turn, [11, 12, 13, 14], filters: { 'status' => 'open' }, truncated: true) }
  let(:review) { copilot_review(turn, collection, question: 'Is it about money?') }

  before do
    review.findings.create!(conversation_id: 11, status: :reviewed, matched: true)
    review.findings.create!(conversation_id: 12, status: :reviewed, matched: false)
    review.findings.create!(conversation_id: 13, status: :screened_out)
  end

  it 'reads its selection from the collection' do
    expect(review.resource).to eq('conversations')
    expect(review.selected_ids).to eq([11, 12, 13, 14])
    expect(review.filters).to eq('status' => 'open')
    expect(review).to be_selection_truncated
    expect(review.remaining_ids).to eq([14])
    expect(review.left_this_turn).to eq(297)
  end

  it 'summarizes its coverage' do
    expect(review.summary).to include(question: 'Is it about money?', selected: 4, processed: 3, remaining: 1, screened_out: 1,
                                      reviewed: 2, matched: 1, failed: 0, selection_truncated: true)
  end

  it 'gives the matched conversations, or every decided one, once finished' do
    expect { review.record_ids }.to raise_error(ArgumentError, 'The review has not finished yet')

    review.update!(status: :incomplete)
    expect(review.record_ids).to eq([11])
    expect(review.record_ids(only_matched: false)).to eq([11, 12, 13])
  end

  it 'posts its progress in words' do
    review.publish_progress

    expect(review.copilot_thread.copilot_messages.last.message['content'])
      .to eq("Processed 3 of 4 conversations: 1 matched, 2 didn't match, 0 couldn't be reviewed.")
  end

  describe '#continue_review' do
    let(:next_turn) { start_copilot_turn(account: account, user: user, thread: turn.copilot_thread) }
    let(:next_call) { next_turn.tool_calls.create!(call_id: 'continue', name: 'continue_review', status: :running) }

    it 'moves an unfinished review to the next turn with that turn budget' do
      review.update!(status: :incomplete, error: 'Timeout')

      review.continue_review(next_call)

      expect(review.reload).to have_attributes(copilot_tool_call_id: next_call.id, status: 'queued', error: nil)
      expect(review.context).to include('turn_start' => 3, 'turn_limit' => 303)
      expect(review.continue_review(next_call)).to be_nil
    end

    it 'refuses a review that is running, done, or from the same turn' do
      expect { review.continue_review(next_call) }.to raise_error(ArgumentError, 'The review is still running')

      review.update!(status: :incomplete)
      same_turn_call = turn.tool_calls.create!(call_id: 'again', name: 'continue_review', status: :running)
      expect { review.continue_review(same_turn_call) }.to raise_error(ArgumentError, /This turn already reviewed a batch/)

      review.findings.create!(conversation_id: 14, status: :failed)
      expect { review.continue_review(next_call) }.to raise_error(ArgumentError, 'The review has no conversations left to review')
    end
  end
end
