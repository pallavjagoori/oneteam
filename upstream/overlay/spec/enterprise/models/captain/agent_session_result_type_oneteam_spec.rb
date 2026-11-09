# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an assistant session must record a Message result.
RSpec.describe Captain::AgentSession do
  it 'rejects a result type that does not match the session type' do
    session = described_class.new(session_type: 'assistant', result_type: 'CopilotMessage')
    session.valid?

    expect(session.errors[:result_type]).to include('must be Message for assistant sessions')
  end
end
