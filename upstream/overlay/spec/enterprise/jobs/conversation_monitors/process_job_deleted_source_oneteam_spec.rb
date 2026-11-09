# frozen_string_literal: true

require 'rails_helper'

# OneTeam: work whose source disappears mid-evaluation is dropped quietly.
RSpec.describe ConversationMonitors::ProcessJob do
  it 'ignores a record deleted during evaluation' do
    allow(ConversationMonitors::WorkItem).to receive(:find_by).and_return(instance_double(ConversationMonitors::WorkItem))
    allow(ConversationMonitors::Evaluator).to receive(:new).and_raise(ActiveRecord::RecordNotFound)

    expect(described_class.new.perform(1)).to be_nil
  end
end
