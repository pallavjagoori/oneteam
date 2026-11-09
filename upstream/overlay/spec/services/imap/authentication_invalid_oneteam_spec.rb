# frozen_string_literal: true

require 'rails_helper'

# OneTeam: only the user-configurable IMAP mechanisms are accepted.
RSpec.describe Imap::Authentication do
  it 'rejects an unknown mechanism' do
    expect { described_class.validate_user_configurable!('xoauth2') }
      .to raise_error(StandardError, 'Invalid IMAP authentication mechanism. Allowed values: plain, login, cram-md5')
  end
end
