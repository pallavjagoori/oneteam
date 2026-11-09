# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a missing OpenAI key fails with a clear message.
RSpec.describe Llm::LegacyBaseOpenAiService do
  it 'explains a client setup failure' do
    InstallationConfig.where(name: 'CAPTAIN_OPEN_AI_API_KEY').delete_all

    expect { described_class.new }.to raise_error(RuntimeError, /\AFailed to initialize OpenAI client: /)
  end
end
