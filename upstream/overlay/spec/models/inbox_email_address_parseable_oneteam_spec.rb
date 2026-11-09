# frozen_string_literal: true

require 'rails_helper'

# OneTeam: unparseable addresses fall back to the default sender or a plain header.
RSpec.describe EmailAddressParseable do
  let(:host) do
    Class.new do
      include EmailAddressParseable

      def default_sender_email_address = 'fallback@example.com'
    end.new
  end

  it 'falls back when the address cannot be parsed' do
    allow(Mail::Address).to receive(:new).and_raise(Mail::Field::ParseError.new(Mail::Field, 'x', 'bad'))

    expect(host.send(:parse_email, 'broken')).to eq('fallback@example.com')
    expect(host.send(:format_email_with_name, 'Acme', 'broken')).to eq('Acme <broken>')
  end
end
