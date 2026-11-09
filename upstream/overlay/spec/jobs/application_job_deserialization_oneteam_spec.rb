# frozen_string_literal: true

require 'rails_helper'

# OneTeam: jobs whose record was deleted before they ran are skipped and logged.
RSpec.describe ApplicationJob do
  it 'discards and logs a job whose argument no longer exists' do
    job_class = Class.new(described_class) do
      def self.name = 'OneteamProbeJob'
      def perform(_record) = nil
    end
    stub_const('OneteamProbeJob', job_class)
    account = create(:account)
    serialized = job_class.new(account).serialize
    account.destroy!
    allow(Rails.logger).to receive(:info)

    ActiveJob::Base.execute(serialized)

    expect(Rails.logger).to have_received(:info).with(/Skipping OneteamProbeJob .* because of ActiveJob::DeserializationError/)
  end
end
