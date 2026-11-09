# frozen_string_literal: true

require 'rails_helper'

# OneTeam: country normalizers must implement normalize and the country pattern.
RSpec.describe Whatsapp::PhoneNormalizers::BasePhoneNormalizer do
  it 'requires subclasses to implement normalize and country_code_pattern' do
    expect { described_class.new.normalize('5511999999999') }.to raise_error(NotImplementedError, /#normalize/)
    expect { described_class.new.send(:country_code_pattern) }.to raise_error(NotImplementedError, /#country_code_pattern/)
  end
end
