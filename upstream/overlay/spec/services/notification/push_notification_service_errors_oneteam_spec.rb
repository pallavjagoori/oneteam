require 'rails_helper'

# OneTeam coverage for push notification delivery edge cases: users who turned
# the push off, browser push errors (rate limits, network errors, anything
# else), FCM tokens Firebase rejects, and relaying mobile pushes through
# Chatwoot's hub when the install has no Firebase credentials.
describe Notification::PushNotificationService do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account) }
  let(:notification) { create(:notification, user: user, account: account) }
  let(:service) { described_class.new(notification: notification) }

  before do
    allow(Rails.logger).to receive(:info)
    allow(Rails.logger).to receive(:warn)
    allow(Rails.logger).to receive(:error)
  end

  it 'sends nothing when the user turned off this push' do
    user.notification_settings.find_by(account_id: account.id).update!(selected_push_flags: [])
    allow(WebPush).to receive(:payload_send)
    create(:notification_subscription, user: user)

    with_modified_env(VAPID_PUBLIC_KEY: 'test') { service.perform }

    expect(WebPush).not_to have_received(:payload_send)
  end

  context 'when a browser push fails' do
    let!(:subscription) { create(:notification_subscription, user: user) }

    def push_failing_with(error)
      allow(WebPush).to receive(:payload_send).and_raise(error)
      with_modified_env(VAPID_PUBLIC_KEY: 'test', ENABLE_PUSH_RELAY_SERVER: 'false') { service.perform }
    end

    it 'keeps the subscription when rate limited' do
      push_failing_with(WebPush::TooManyRequests.new(instance_double(Net::HTTPResponse, body: 'slow down', inspect: 'response'), 'push.example'))

      expect(Rails.logger).to have_received(:warn).with(/WebPush rate limited for #{user.email}/)
      expect(subscription.reload).to be_present
    end

    it 'logs network errors' do
      push_failing_with(Net::ReadTimeout)

      expect(Rails.logger).to have_received(:error).with(/WebPush operation error/)
    end

    it 'reports unexpected errors' do
      tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
      allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)

      push_failing_with(ArgumentError.new('bad key'))

      expect(tracker).to have_received(:capture_exception)
    end
  end

  it 'removes FCM tokens Firebase rejects' do
    fcm = instance_double(FCM, send_v1: { body: { results: [{ error: 'NotRegistered' }] }.to_json })
    allow(Notification::FcmService).to receive(:new).and_return(instance_double(Notification::FcmService, fcm_client: fcm))
    allow(GlobalConfigService).to receive(:load).and_call_original
    allow(GlobalConfigService).to receive(:load).with('FIREBASE_PROJECT_ID', nil).and_return('project')
    allow(GlobalConfigService).to receive(:load).with('FIREBASE_CREDENTIALS', nil).and_return('credentials')
    subscription = create(:notification_subscription, :fcm, user: user)

    service.perform

    expect(NotificationSubscription.exists?(subscription.id)).to be(false)
  end

  it 'relays mobile pushes through the Chatwoot hub without Firebase credentials' do
    allow(ChatwootHub).to receive(:send_push)
    create(:notification_subscription, :fcm, user: user)

    with_modified_env(ENABLE_PUSH_RELAY_SERVER: 'true') { service.perform }

    expect(ChatwootHub).to have_received(:send_push)
  end
end
