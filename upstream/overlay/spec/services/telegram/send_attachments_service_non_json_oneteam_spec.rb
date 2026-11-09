# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a non-JSON Telegram reply becomes a failed response.
RSpec.describe Telegram::SendAttachmentsService do
  it 'wraps a non-JSON body as a failure' do
    response = Struct.new(:body, :status, :reason_phrase).new('<html>', 502, 'Bad Gateway')

    parsed = described_class.new(message: build(:message)).send(:parse_faraday_response, response)

    expect(parsed.success?).to be(false)
    expect(parsed.parsed_response).to eq('ok' => false, 'error_code' => 502, 'description' => 'Bad Gateway')
  end
end
