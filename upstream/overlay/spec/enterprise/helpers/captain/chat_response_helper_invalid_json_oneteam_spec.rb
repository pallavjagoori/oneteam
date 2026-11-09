require 'rails_helper'

# OneTeam coverage for chat responses that are not valid JSON: the raw text
# becomes the content.
RSpec.describe Captain::ChatResponseHelper do
  it 'wraps text that is not JSON' do
    host = Class.new { include Captain::ChatResponseHelper }.new
    host.instance_variable_set(:@assistant, Struct.new(:id).new(9))

    expect(host.send(:parse_json_response, "```json\nnot json\n```")).to eq('content' => 'not json')
  end
end
