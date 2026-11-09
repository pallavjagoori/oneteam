# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an unparseable sender address still gets the localized header.
RSpec.describe Email::SenderNameBuilder do
  it 'falls back to the plain header when the address cannot be parsed' do
    account = create(:account)
    allow(Mail::Address).to receive(:new).and_raise(Mail::Field::ParseError.new(Mail::Field, 'x', 'bad'))
    builder = described_class.new(account: account, sender: nil, sender_email: 'support@example.com',
                                  sender_name: 'Jane', business_name: 'Acme')

    expect(builder.build).to include('support@example.com')
  end
end
