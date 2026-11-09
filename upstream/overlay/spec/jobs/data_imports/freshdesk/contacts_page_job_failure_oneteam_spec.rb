# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an unexpected error on a contacts page fails the import and re-raises.
RSpec.describe DataImports::Freshdesk::ContactsPageJob do
  let(:data_import) { create(:data_import, :freshdesk) }
  let(:importer) { instance_double(DataImports::Freshdesk::Importer, contacts_completed?: false, fail!: true) }
  let(:error) { StandardError.new('boom') }

  it 'marks the import failed and raises' do
    allow(DataImports::Freshdesk::Importer).to receive(:new).and_return(importer)
    allow(importer).to receive(:import_contacts_page).and_raise(error)

    expect { described_class.perform_now(data_import, nil, nil) }.to raise_error(StandardError, 'boom')
    expect(importer).to have_received(:fail!).with(error)
  end
end
