require 'rails_helper'

RSpec.describe Migration::AddSearchIndexesJob do
  it 'runs on the scheduled jobs queue' do
    expect(described_class.new.queue_name).to eq('scheduled_jobs')
  end

  it 'adds the message and contact search indexes concurrently' do
    migration = ActiveRecord::Base.connection
    allow(migration).to receive(:add_index)

    described_class.perform_now

    expect(migration).to have_received(:add_index).with('messages', [:account_id, :inbox_id], algorithm: :concurrently)
    expect(migration).to have_received(:add_index)
      .with('messages', :content, using: 'gin', opclass: :gin_trgm_ops, algorithm: :concurrently)
    expect(migration).to have_received(:add_index).with(
      'contacts', [:name, :email, :phone_number, :identifier],
      using: 'gin', opclass: :gin_trgm_ops, name: 'index_contacts_on_name_email_phone_number_identifier', algorithm: :concurrently
    )
  end
end
