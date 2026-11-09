require 'rails_helper'

RSpec.describe Voice::InboundCallBuilder do
  it 'returns the call a concurrent retry created' do
    builder = described_class.new(inbox: create(:inbox), call_sid: 'CA123', caller: {})
    allow(builder).to receive(:find_existing_call).and_return(nil, :existing_call)
    allow(builder).to receive(:ensure_contact_inbox!).and_raise(ActiveRecord::RecordNotUnique)

    expect(builder.perform!).to eq(:existing_call)
  end
end
