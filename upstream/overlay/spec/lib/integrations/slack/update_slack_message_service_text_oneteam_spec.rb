# frozen_string_literal: true

require 'rails_helper'

# OneTeam: missing keys give nil, and blank message content is passed through.
RSpec.describe Integrations::Slack::UpdateSlackMessageService do
  let(:service) { described_class.new(message: build(:message, content: ''), hook: nil) }

  it 'finds no value when none of the keys are present' do
    expect(service.send(:flex_value, { other: 1 }, :ts, :id)).to be_nil
  end

  it 'returns blank content unchanged' do
    expect(service.send(:message_text)).to eq('')
  end
end
