# frozen_string_literal: true

require 'rails_helper'

# OneTeam: when even marking the cost incomplete fails, both failures are logged.
RSpec.describe Captain::ChatGenerationRecorder do
  it 'logs both cost failures' do
    host = Class.new { include Captain::ChatGenerationRecorder }.new
    run = Class.new { def record_cost!(_cost) = raise(StandardError, 'db down') }.new
    message = Class.new do
      def role = 'assistant'
      def cost = raise(StandardError, 'no cost')
    end.new
    allow(Rails.logger).to receive(:warn)

    host.send(:record_generation_cost, run, message)

    expect(Rails.logger).to have_received(:warn).with('Failed to mark LLM generation cost incomplete: db down')
    expect(Rails.logger).to have_received(:warn).with('Failed to record LLM generation cost: no cost')
  end
end
