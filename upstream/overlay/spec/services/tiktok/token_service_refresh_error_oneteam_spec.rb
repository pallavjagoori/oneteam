require 'rails_helper'

# OneTeam coverage for a TikTok token refresh that fails: the lock is
# released and the error raised.
RSpec.describe Tiktok::TokenService do
  it 'releases the lock and re-raises when the refresh fails' do
    lock_manager = instance_double(Redis::LockManager, lock: true, unlock: true)
    allow(Redis::LockManager).to receive(:new).and_return(lock_manager)
    service = described_class.new(channel: instance_double(Channel::Tiktok, id: 5))
    allow(service).to receive(:attempt_refresh_token).and_raise(StandardError, 'refresh failed')

    expect { service.send(:refresh_access_token) }.to raise_error(StandardError, 'refresh failed')
    expect(lock_manager).to have_received(:unlock)
  end
end
