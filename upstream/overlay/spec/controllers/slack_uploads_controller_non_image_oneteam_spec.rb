require 'rails_helper'

RSpec.describe SlackUploadsController do
  it 'links non-image blobs directly' do
    controller_instance = described_class.new
    blob = ActiveStorage::Blob.create_and_upload!(io: StringIO.new('report'), filename: 'report.pdf', content_type: 'application/pdf')
    controller_instance.instance_variable_set(:@blob, blob)
    allow(controller_instance).to receive(:url_for).with(blob).and_return('https://example.com/report.pdf')

    expect(controller_instance.send(:blob_url)).to eq('https://example.com/report.pdf')
  end
end
