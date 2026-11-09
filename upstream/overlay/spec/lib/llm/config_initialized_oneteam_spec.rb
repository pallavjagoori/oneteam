# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the LLM config starts out uninitialized.
RSpec.describe Llm::Config do
  it 'is not initialized before setup' do
    previous = described_class.instance_variable_get(:@initialized)
    described_class.instance_variable_set(:@initialized, nil)

    expect(described_class.initialized?).to be(false)
  ensure
    described_class.instance_variable_set(:@initialized, previous)
  end
end
