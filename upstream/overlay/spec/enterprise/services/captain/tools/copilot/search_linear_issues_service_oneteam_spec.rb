require 'rails_helper'

# OneTeam coverage for how Linear's numeric priorities read to Copilot, and
# for an issue with no assignee or description.
RSpec.describe Captain::Tools::Copilot::SearchLinearIssuesService do
  let(:account) { create(:account) }
  let(:service) { described_class.new(create(:captain_assistant, account: account), user: create(:user, account: account)) }
  let(:linear) { instance_double(Integrations::Linear::ProcessorService) }

  before do
    create(:integrations_hook, :linear, account: account)
    allow(Integrations::Linear::ProcessorService).to receive(:new).and_return(linear)
  end

  def priority_label(priority)
    issue = { 'title' => 'Bug', 'id' => 'L-1', 'state' => { 'name' => 'Todo' }, 'priority' => priority }
    allow(linear).to receive(:search_issue).and_return({ data: [issue] })
    service.execute(term: 'bug')[/Priority: (.*)/, 1]
  end

  it 'names each Linear priority' do
    expect([nil, 0, 1, 2, 3, 4, 9].map { |priority| priority_label(priority) })
      .to eq(['No priority', 'No priority', 'Urgent', 'High', 'Medium', 'Low', 'Unknown'])
  end

  it 'shows an unassigned issue without a description' do
    priority_label(1)
    result = service.execute(term: 'bug')

    expect(result).to include('Assignee: Unassigned')
    expect(result).not_to include('Description:')
  end
end
