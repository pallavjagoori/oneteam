require 'rails_helper'

RSpec.describe ContactInboxWithContactBuilder do
  it 'retries once when a concurrent request created the contact first' do
    builder = described_class.new(inbox: create(:inbox), contact_attributes: {})
    attempts = 0
    allow(builder).to receive(:find_or_create_contact_and_contact_inbox) do
      attempts += 1
      raise ActiveRecord::RecordNotUnique if attempts == 1

      :contact_inbox
    end

    expect(builder.perform).to eq(:contact_inbox)
    expect(attempts).to eq(2)
  end
end
