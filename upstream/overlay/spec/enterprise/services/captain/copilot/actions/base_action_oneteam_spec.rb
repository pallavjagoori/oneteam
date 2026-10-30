require 'rails_helper'

# OneTeam coverage for the contract every Copilot action follows: a subclass
# must implement perform.
RSpec.describe Captain::Copilot::Actions::BaseAction do
  it 'leaves perform to subclasses' do
    action = Class.new(described_class) do
      const_set(:NAME, 'noop')
      const_set(:ARGUMENTS, { 'type' => 'object' })
    end

    expect { action.new(account: nil, user: nil, arguments: {}).perform(nil) }.to raise_error(NotImplementedError)
  end
end
