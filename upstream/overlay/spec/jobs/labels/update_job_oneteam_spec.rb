require 'rails_helper'

# OneTeam coverage: renaming a label renames it on tagged records through
# Labels::UpdateService.
RSpec.describe Labels::UpdateJob do
  it 'runs the label update service with the old and new titles' do
    service = instance_double(Labels::UpdateService, perform: true)
    allow(Labels::UpdateService).to receive(:new)
      .with(new_label_title: 'gold', old_label_title: 'vip', account_id: 1).and_return(service)

    described_class.perform_now('gold', 'vip', 1)

    expect(service).to have_received(:perform)
  end
end
