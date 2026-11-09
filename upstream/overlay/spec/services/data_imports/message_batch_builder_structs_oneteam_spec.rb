require 'rails_helper'

# OneTeam coverage for the batch structs that split imported conversation
# parts into the source message and the rest.
RSpec.describe DataImports::MessageBatchBuilder do
  it 'splits source entries from part entries' do
    source = described_class::Entry.new(part: { 'part_type' => 'source' })
    comment = described_class::Entry.new(part: { 'part_type' => 'comment' })
    batch = described_class::Batch.new(items: [source, comment])

    expect(batch.source_entries).to eq([source])
    expect(batch.part_entries).to eq([comment])
  end
end
