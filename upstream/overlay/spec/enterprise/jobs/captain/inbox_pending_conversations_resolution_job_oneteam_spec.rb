require 'rails_helper'

# OneTeam coverage for pending conversations deleted while Captain decides
# whether to resolve them: the job skips them instead of failing, whether the
# conversation disappears during the completion check, or just before it is
# resolved or handed off.
RSpec.describe Captain::InboxPendingConversationsResolutionJob, type: :job do
  let!(:inbox) { create(:inbox) }
  let!(:conversation) { create(:conversation, inbox: inbox, last_activity_at: 2.hours.ago, status: :pending) }
  let!(:assistant) { create(:captain_assistant, account: inbox.account, config: { 'auto_resolve_mode' => 'evaluated' }) }
  let(:completion) { instance_double(Captain::ConversationCompletionService) }

  before do
    create(:captain_inbox, inbox: inbox, captain_assistant: assistant)
    inbox.account.enable_features!('captain_tasks')
    inbox.reload
    allow(Captain::ConversationCompletionService).to receive(:new).and_return(completion)
    allow(Captain::ConversationEvents).to receive(:resolved)
    allow(Captain::ConversationEvents).to receive(:handed_off)
  end

  def lose_conversation_before_locking
    allow_any_instance_of(Conversation).to receive(:with_lock).and_raise(ActiveRecord::RecordNotFound) # rubocop:disable RSpec/AnyInstance
  end

  it 'skips a conversation deleted during the completion check' do
    allow(completion).to receive(:perform) do
      Conversation.where(id: conversation.id).delete_all
      { complete: true, reason: 'answered' }
    end

    expect { described_class.perform_now(inbox) }.not_to raise_error
    expect(Captain::ConversationEvents).not_to have_received(:resolved)
  end

  { true => :resolved, false => :handed_off }.each do |complete, event|
    it "skips a conversation deleted just before it is #{event.to_s.tr('_', ' ')}" do
      allow(completion).to receive(:perform).and_return({ complete: complete, reason: 'checked' })
      lose_conversation_before_locking

      expect { described_class.perform_now(inbox) }.not_to raise_error
      expect(Captain::ConversationEvents).not_to have_received(event)
    end
  end

  it 'skips a conversation deleted just before a time-based resolve' do
    assistant.update!(config: { 'auto_resolve_mode' => 'legacy' })
    lose_conversation_before_locking

    expect { described_class.perform_now(inbox.reload) }.not_to raise_error
    expect(Captain::ConversationEvents).not_to have_received(:resolved)
  end
end
