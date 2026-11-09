# frozen_string_literal: true

require 'rails_helper'

# OneTeam: executed and skipped executions are terminal; pending ones are not.
RSpec.describe AutomationRulePendingExecution do
  it 'is terminal once executed or skipped' do
    execution = described_class.new(status: :pending)

    expect(execution.terminal?).to be(false)
    execution.status = :executed
    expect(execution.terminal?).to be(true)
    execution.status = :skipped
    expect(execution.terminal?).to be(true)
  end
end
