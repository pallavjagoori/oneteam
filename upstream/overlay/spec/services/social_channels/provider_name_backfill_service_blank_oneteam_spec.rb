require 'rails_helper'

# OneTeam coverage for channels whose provider returns a blank name.
RSpec.describe SocialChannels::ProviderNameBackfillService do
  it 'skips channels with a blank provider name' do
    output = StringIO.new
    service = described_class.new(output: output, delay_seconds: 0)
    allow(service).to receive(:fetch_provider_name).and_return('')
    channel = Struct.new(:id, :account_id).new(7, 3)
    summary = Hash.new(0)

    service.send(:process_channel, :instagram, channel, summary)

    expect(summary[:skipped]).to eq(1)
    expect(output.string).to include('[skipped] provider=instagram channel_id=7 account_id=3 reason=blank_name')
  end
end
