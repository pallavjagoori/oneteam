# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the job passes the conversion to the tracking service.
RSpec.describe Internal::Accounts::MarketingConversionTrackingJob do
  it 'tracks the conversion for the account' do
    account = create(:account)
    service = instance_double(Internal::Accounts::MarketingConversionTrackingService, perform: true)
    allow(Internal::Accounts::MarketingConversionTrackingService).to receive(:new).and_return(service)

    described_class.new.perform(account.id, 'purchase', nil, 10, 'USD')

    expect(Internal::Accounts::MarketingConversionTrackingService).to have_received(:new)
      .with(hash_including(account: account, event_name: 'purchase'))
    expect(service).to have_received(:perform)
  end
end
