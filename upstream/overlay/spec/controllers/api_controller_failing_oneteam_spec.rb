require 'rails_helper'

# OneTeam coverage for the health endpoint's failure answers when Redis or
# Postgres cannot be reached.
RSpec.describe ApiController do
  let(:controller_instance) { described_class.new }

  it 'reports Redis as failing when it cannot connect' do
    allow(Redis).to receive(:new).and_raise(Redis::CannotConnectError)

    expect(controller_instance.send(:redis_status)).to eq('failing')
  end

  it 'reports Postgres as failing when no connection is established' do
    allow(ActiveRecord::Base.connection).to receive(:active?).and_raise(ActiveRecord::ConnectionNotEstablished)

    expect(controller_instance.send(:postgres_status)).to eq('failing')
  end
end
