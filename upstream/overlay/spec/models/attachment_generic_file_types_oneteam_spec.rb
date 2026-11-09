require 'rails_helper'

# OneTeam coverage for files sent as application/octet-stream: allowed when
# their extension is on the accepted list.
RSpec.describe Attachment do
  def attachment_named(filename)
    described_class.new.tap do |attachment|
      allow(attachment).to receive(:file).and_return(Struct.new(:filename).new(filename))
    end
  end

  it 'accepts generic content with an accepted extension' do
    attachment = attachment_named('cert.PFX')

    attachment.send(:validate_file_content_type, 'application/octet-stream')

    expect(attachment.errors[:file]).to be_empty
  end

  it 'rejects generic content with another extension' do
    attachment = attachment_named('tool.exe')

    attachment.send(:validate_file_content_type, 'application/octet-stream')

    expect(attachment.errors[:file]).to include('type not supported')
  end
end
