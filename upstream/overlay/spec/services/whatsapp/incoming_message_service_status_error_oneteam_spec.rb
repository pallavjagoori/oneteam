# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a bad status update is logged and skipped; the inbox's account is used.
RSpec.describe Whatsapp::IncomingMessageService do
  let(:inbox) { build(:inbox) }
  let(:service) { described_class.new(inbox: inbox, params: { statuses: [{ id: 'wamid-1' }] }) }

  it 'logs an ArgumentError while processing a status' do
    service.instance_variable_set(:@processed_params, { statuses: [{ id: 'wamid-1' }] })
    allow(service).to receive(:find_message_by_source_id).and_return(true)
    allow(service).to receive(:update_whatsapp_identifiers_from_status).and_raise(ArgumentError, 'bad status')
    allow(Rails.logger).to receive(:error)

    service.send(:process_statuses)

    expect(Rails.logger).to have_received(:error).with('Error while processing whatsapp status update bad status')
  end

  it 'reads the account from the inbox' do
    expect(service.send(:account)).to eq(inbox.account)
  end
end
