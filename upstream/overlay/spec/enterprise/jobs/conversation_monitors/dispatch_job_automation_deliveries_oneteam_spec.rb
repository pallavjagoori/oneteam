require 'rails_helper'

RSpec.describe ConversationMonitors::DispatchJob do
  it 'enqueues sweepable automation deliveries and purges finished ones' do
    relation = instance_double(ActiveRecord::Relation)
    allow(relation).to receive_messages(order: relation, limit: relation, pluck: [7])
    allow(ConversationMonitors::AutomationDelivery).to receive(:sweepable).and_return(relation)
    allow(ConversationMonitors::AutomationDelivery).to receive(:purge_terminal!)
    allow(ConversationMonitors::ProcessAutomationDeliveryJob).to receive(:perform_later)

    described_class.new.send(:dispatch_automation_deliveries)

    expect(ConversationMonitors::ProcessAutomationDeliveryJob).to have_received(:perform_later).with(7)
    expect(ConversationMonitors::AutomationDelivery).to have_received(:purge_terminal!)
  end
end
