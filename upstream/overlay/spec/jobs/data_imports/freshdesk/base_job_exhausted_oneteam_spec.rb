require 'rails_helper'

# OneTeam coverage for Freshdesk import jobs that run out of retries on client
# or rate limit errors: the import is failed (here there is none to fail).
RSpec.describe DataImports::Freshdesk::BaseJob do
  include ActiveJob::TestHelper

  def probe_job(error)
    stub_const('OneteamFreshdeskProbeJob', Class.new(described_class) do
      define_method(:perform) { raise error }
    end)
  end

  it 'gives up after repeated client errors' do
    probe_job(DataImports::Freshdesk::Client::Error.new('down', status: 500))

    expect { perform_enqueued_jobs { OneteamFreshdeskProbeJob.perform_later } }.not_to raise_error
  end

  it 'gives up after repeated rate limits' do
    probe_job(DataImports::Freshdesk::Client::RateLimitError.new('slow down', retry_after: 0))

    expect { perform_enqueued_jobs { OneteamFreshdeskProbeJob.perform_later } }.not_to raise_error
  end
end
