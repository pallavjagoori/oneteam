# frozen_string_literal: true

require 'rails_helper'

# OneTeam: channel senders must define their channel class and reply.
RSpec.describe Base::SendOnChannelService do
  let(:service) { described_class.new(message: build(:message)) }

  it 'requires channel_class and perform_reply from subclasses' do
    expect { service.send(:channel_class) }.to raise_error(RuntimeError, 'Overwrite this method in child class')
    expect { service.send(:perform_reply) }.to raise_error(RuntimeError, 'Overwrite this method in child class')
  end
end
