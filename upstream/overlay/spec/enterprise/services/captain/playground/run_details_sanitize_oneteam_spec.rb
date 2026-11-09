require 'rails_helper'

# OneTeam coverage for sanitizing playground run details: lists, plain
# values and JSON strings holding scalars.
RSpec.describe Captain::Playground::RunDetails do
  let(:details) { described_class.allocate }

  it 'sanitizes each item of a list and keeps plain values' do
    expect(details.send(:sanitize, [{ 'api_key' => 'secret' }, 3])).to eq([{ 'api_key' => '[REDACTED]' }, 3])
  end

  it 'redacts credentials in JSON scalars' do
    allow(details).to receive(:redact_inline_credentials).and_call_original

    details.send(:sanitize_string, '"plain"')

    expect(details).to have_received(:redact_inline_credentials).with('"plain"')
  end
end
