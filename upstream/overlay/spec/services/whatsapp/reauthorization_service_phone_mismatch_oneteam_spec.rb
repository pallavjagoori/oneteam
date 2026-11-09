# frozen_string_literal: true

require 'rails_helper'

# OneTeam: reauthorizing with a different phone number is refused.
RSpec.describe Whatsapp::ReauthorizationService do
  it 'raises when the phone number does not match the channel' do
    account = create(:account)
    channel = create(:channel_whatsapp, account: account, provider: 'whatsapp_cloud',
                                        validate_provider_config: false, sync_templates: false)
    service = described_class.new(account: account, inbox_id: channel.inbox.id, phone_number_id: 'p', waba_id: 'w')

    expect { service.perform('token', { phone_number: '+19999999999' }) }
      .to raise_error(StandardError, "Phone number mismatch. Expected #{channel.phone_number}, got +19999999999")
  end
end
