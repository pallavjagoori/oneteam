# frozen_string_literal: true

require 'rails_helper'

# OneTeam: empty trace content is recorded as an empty string.
RSpec.describe Captain::Assistant::TracePayloadHelper do
  it 'turns nil content into an empty string' do
    host = Class.new { include Captain::Assistant::TracePayloadHelper }.new

    expect(host.send(:trace_content_payload, nil)).to eq('')
  end
end
