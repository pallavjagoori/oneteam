# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a failed-recipients header marks a bounce, and an encoding failure yields an empty string.
RSpec.describe MailPresenter do
  it 'treats an X-Failed-Recipients header as a bounce' do
    mail = Mail.new { header['X-Failed-Recipients'] = 'gone@example.com' }

    expect(described_class.new(mail).bounced?).to be(true)
  end

  it 'returns an empty string when re-encoding fails' do
    text = Class.new do
      def blank? = false
      def encoding = Encoding::ISO_8859_1
      def encode(*) = raise(ArgumentError, 'bad')
    end.new

    expect(described_class.new(Mail.new).send(:encode_to_unicode, text)).to eq('')
  end
end
