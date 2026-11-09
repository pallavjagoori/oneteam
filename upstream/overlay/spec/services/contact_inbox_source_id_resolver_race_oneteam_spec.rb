require 'rails_helper'

RSpec.describe ContactInboxSourceIdResolver do
  it 'returns the preferred contact inbox when another request created it first' do
    inbox = create(:inbox)
    existing = create(:contact_inbox, inbox: inbox, source_id: 'old-id')
    preferred = create(:contact_inbox, inbox: inbox, source_id: 'new-id')
    resolver = described_class.new(inbox: inbox, source_ids: ['new-id'], contact_attributes: {})

    expect(resolver.send(:adopt_preferred_source_id, existing)).to eq(preferred)
  end
end
