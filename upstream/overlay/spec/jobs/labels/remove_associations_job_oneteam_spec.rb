require 'rails_helper'

# OneTeam coverage: deleting a label strips it from conversations and contacts
# through Labels::DestroyService.
RSpec.describe Labels::RemoveAssociationsJob do
  it 'runs the label destroy service with the job arguments' do
    deleted_at = Time.current
    service = instance_double(Labels::DestroyService, perform: true)
    allow(Labels::DestroyService).to receive(:new)
      .with(label_title: 'vip', account_id: 1, label_deleted_at: deleted_at).and_return(service)

    described_class.perform_now(label_title: 'vip', account_id: 1, label_deleted_at: deleted_at)

    expect(service).to have_received(:perform)
  end
end
