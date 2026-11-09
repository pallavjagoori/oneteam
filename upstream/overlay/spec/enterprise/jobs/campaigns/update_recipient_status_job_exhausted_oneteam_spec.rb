# frozen_string_literal: true

require 'rails_helper'

# OneTeam: after the last retry, an unknown campaign recipient is logged and dropped.
RSpec.describe Campaigns::UpdateRecipientStatusJob do
  include ActiveJob::TestHelper

  it 'logs once the retries for a missing recipient run out' do
    inbox = create(:inbox)
    allow(Rails.logger).to receive(:warn)

    perform_enqueued_jobs { described_class.perform_later(inbox.id, { id: 'wamid-missing', status: 'read' }) }

    expect(Rails.logger).to have_received(:warn).with("Campaign recipient status could not be reconciled for inbox #{inbox.id}")
  end
end
