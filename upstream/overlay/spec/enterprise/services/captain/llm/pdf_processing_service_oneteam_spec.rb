require 'rails_helper'

# OneTeam coverage for the Langfuse span around uploading a PDF document to
# OpenAI's Files API, recorded in memory. Chatwoot's spec covers the upload
# itself with tracing off.
RSpec.describe Captain::Llm::PdfProcessingService do
  include_context 'with Langfuse tracing'

  let(:document) { create(:captain_document) }
  let(:files_api) { instance_double(OpenAI::Files) }
  let(:service) { described_class.new(document) }

  before do
    allow(InstallationConfig).to receive(:find_by!).and_call_original
    allow(InstallationConfig).to receive(:find_by!).with(name: 'CAPTAIN_OPEN_AI_API_KEY')
                                                   .and_return(instance_double(InstallationConfig, value: 'test-key'))
    allow(OpenAI::Client).to receive(:new).and_return(instance_double(OpenAI::Client, files: files_api))
    allow(document).to receive_messages(openai_file_id: nil, store_openai_file_id: true)
    blob = instance_double(ActiveStorage::Blob)
    allow(blob).to receive(:open).and_yield(StringIO.new('%PDF'))
    allow(document).to receive(:pdf_file).and_return(instance_double(ActiveStorage::Attachment, blob: blob))
  end

  it 'records the upload with the document and the returned file id' do
    allow(files_api).to receive(:upload).and_return({ 'id' => 'file-abc' })

    service.process

    expect(span_named('llm.file.upload').attributes).to include(
      'gen_ai.provider' => 'openai', 'file.purpose' => 'assistants', 'file.id' => 'file-abc',
      'langfuse.user.id' => document.account_id.to_s, 'langfuse.trace.tags' => '["pdf_upload"]',
      'langfuse.trace.metadata.document_id' => document.id.to_s
    )
  end

  it 'records a failed upload without a file id' do
    allow(files_api).to receive(:upload).and_return({ 'id' => nil })

    expect { service.process }.to raise_error(CustomExceptions::Pdf::UploadError)
    expect(span_named('llm.file.upload').attributes).not_to have_key('file.id')
  end
end
