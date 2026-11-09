require 'rails_helper'

# OneTeam coverage for RoomChannel#update_presence, which the dashboard and
# widget call to refresh online status.
RSpec.describe RoomChannel do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account) }

  before { stub_connection }

  it 'refreshes the subscription and broadcasts presence' do
    allow(OnlineStatusTracker).to receive(:update_presence)
    subscribe(user_id: user.id, pubsub_token: user.pubsub_token, account_id: account.id)

    expect { perform :update_presence }
      .to have_broadcasted_to(user.pubsub_token).with(hash_including(event: 'presence.update'))
    expect(OnlineStatusTracker).to have_received(:update_presence).at_least(:twice)
  end
end
