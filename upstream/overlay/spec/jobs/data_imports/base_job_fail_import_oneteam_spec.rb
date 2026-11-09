require 'rails_helper'

RSpec.describe DataImports::BaseJob do
  it 'marks the import as failed through its importer' do
    data_import = create(:data_import, :intercom)
    job = described_class.new(data_import, 'run-1')
    importer = instance_double(DataImports::Importer, fail!: true)
    error = StandardError.new('boom')
    allow(job).to receive(:skip_import?).and_return(false)
    allow(job).to receive(:importer_for).with(data_import, 'run-1').and_return(importer)

    job.fail_import!(error)

    expect(importer).to have_received(:fail!).with(error)
  end
end
