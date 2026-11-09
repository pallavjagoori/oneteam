require 'rails_helper'

# OneTeam coverage for migrating conversation messages into the assistant
# config: blank values and values the assistant already has are kept as is.
RSpec.describe Captain::AssistantMigration::DraftApplier do
  it 'only fills config keys the assistant has not set' do
    assistant = instance_double(Captain::Assistant, config: { 'welcome_message' => 'Hello' })
    applier = described_class.new(assistant: assistant, draft: {})
    messages = { 'welcome_message' => 'Hi', 'handoff_message' => 'One moment', 'resolution_message' => '' }
    allow(applier).to receive_messages(conversation_messages: messages, migration_config: { 'source' => 'draft' })

    change = applier.send(:config_change)

    expect(change[:to]).to eq('welcome_message' => 'Hello', 'handoff_message' => 'One moment',
                              described_class::CONFIG_KEY => { 'source' => 'draft' })
  end
end
