require 'rails_helper'

RSpec.describe ConversationMonitors::ResultWriter do
  it 'drops the result when the work item was deleted during the provider call' do
    work = instance_double(ConversationMonitors::WorkItem)
    allow(work).to receive(:with_lock).and_raise(ActiveRecord::RecordNotFound)

    expect(described_class.new(work, {}).write(instance_double(ConversationMonitors::Monitor), score: 0.5)).to be_nil
  end
end
