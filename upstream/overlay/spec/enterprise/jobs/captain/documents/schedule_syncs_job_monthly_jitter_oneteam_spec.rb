# frozen_string_literal: true

require 'rails_helper'

# OneTeam: monthly document syncs spread over the monthly jitter window.
RSpec.describe Captain::Documents::ScheduleSyncsJob do
  it 'uses the monthly jitter window for long intervals' do
    job = described_class.new
    allow(job).to receive(:rand).and_return(7)

    expect(job.send(:sync_jitter, 30.days)).to eq(7.seconds)
    expect(job).to have_received(:rand).with(0..described_class::MONTHLY_SYNC_JITTER.to_i)
  end
end
