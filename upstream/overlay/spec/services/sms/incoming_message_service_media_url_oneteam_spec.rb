# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an unparseable media URL never gets provider credentials; the account comes from the inbox.
RSpec.describe Sms::IncomingMessageService do
  let(:inbox) { build(:inbox) }
  let(:service) { described_class.new(inbox: inbox, params: {}) }

  it 'does not treat an invalid URL as provider hosted' do
    expect(service.send(:provider_hosted?, 'https://media host/x.png')).to be(false)
  end

  it 'reads the account from the inbox' do
    expect(service.send(:account)).to eq(inbox.account)
  end
end
