require 'rails_helper'

# OneTeam coverage for avatar downloads that fail with an HTTP error: a 404
# is routine, anything else is an error.
RSpec.describe Avatar::AvatarFromUrlJob do
  let(:job) { described_class.new }
  let(:contact) { create(:contact) }

  before do
    allow(job).to receive(:syncable_avatar?).and_return(true)
    allow(Rails.logger).to receive(:info)
    allow(Rails.logger).to receive(:error)
  end

  it 'logs a missing avatar as info' do
    allow(job).to receive(:fetch_and_attach_avatar).and_raise(SafeFetch::HttpError, '404 Not Found')

    job.perform(contact, 'https://cdn.example/a.png')

    expect(Rails.logger).to have_received(:info).with('AvatarFromUrlJob: avatar not found at https://cdn.example/a.png')
  end

  it 'logs other HTTP failures as errors' do
    allow(job).to receive(:fetch_and_attach_avatar).and_raise(SafeFetch::HttpError, '500 Server Error')

    job.perform(contact, 'https://cdn.example/a.png')

    expect(Rails.logger).to have_received(:error).with(%r{AvatarFromUrlJob error for https://cdn.example/a.png: SafeFetch::HttpError - 500})
  end
end
