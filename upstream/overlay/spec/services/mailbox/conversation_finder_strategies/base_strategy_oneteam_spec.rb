# frozen_string_literal: true

require 'rails_helper'

# OneTeam: each finder strategy must implement find.
RSpec.describe Mailbox::ConversationFinderStrategies::BaseStrategy do
  it 'requires subclasses to implement find' do
    expect { described_class.new(nil).find }.to raise_error(NotImplementedError, /must implement #find/)
  end
end
