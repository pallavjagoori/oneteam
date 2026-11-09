require 'rails_helper'

# OneTeam coverage for label errors while Captain adds a label: logged and
# raised again.
RSpec.describe Captain::Tools::AddLabelToConversationTool do
  it 'logs and re-raises label errors' do
    conversation = instance_double(Conversation)
    allow(conversation).to receive(:add_labels).and_raise(StandardError, 'locked')
    allow(Rails.logger).to receive(:error)

    expect { described_class.allocate.send(:add_label_to_conversation, conversation, 'vip') }.to raise_error(StandardError, 'locked')
    expect(Rails.logger).to have_received(:error).with('Failed to add label to conversation: locked')
  end
end
