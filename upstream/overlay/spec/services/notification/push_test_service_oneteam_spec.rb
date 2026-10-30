require 'rails_helper'

# OneTeam coverage for the super admin push notification test. Each chosen
# device gets a test push and a result row: browsers through Web Push (when
# VAPID keys exist), mobile apps through Firebase directly or through the
# Chatwoot push relay, while VoIP and unknown devices are skipped.
describe Notification::PushTestService do
  let(:user) { create(:user) }
  let(:browser) do
    create(:notification_subscription, user: user,
                                       subscription_attributes: { endpoint: 'https://push.example.com/abcdef123456', p256dh: 'k', auth: 'a' })
  end
  let(:phone) do
    create(:notification_subscription, :fcm, user: user, subscription_attributes: { push_token: 'token-987654', device_id: 'device-123456' })
  end

  def run(subscription, **)
    described_class.new(user: user, subscription_ids: [subscription.id], **).perform.first
  end

  describe 'browsers' do
    before { allow(VapidService).to receive_messages(public_key: 'pub', private_key: 'priv') }

    it 'sends a web push with the default title' do
      expect(WebPush).to receive(:payload_send).with(hash_including(endpoint: 'https://push.example.com/abcdef123456', p256dh: 'k', auth: 'a'))

      expect(run(browser)).to include(type: 'browser_push', status: :success, device: 'push.example.com', token_tail: '…123456')
    end

    it 'reports a rejected push' do
      allow(WebPush).to receive(:payload_send).and_raise(StandardError, 'gone')

      expect(run(browser)).to include(status: :failure, message: 'StandardError: gone')
    end

    it 'is skipped without VAPID keys' do
      allow(VapidService).to receive(:public_key).and_return(nil)

      expect(run(browser)).to include(status: :skipped, message: 'VAPID keys not configured')
    end

    it 'labels devices whose endpoint is missing or not a URL' do
      allow(WebPush).to receive(:payload_send)
      browser.update!(subscription_attributes: {})
      expect(run(browser)).to include(device: '—', token_tail: '—')

      browser.update!(subscription_attributes: { endpoint: 'push service' })
      expect(run(browser)).to include(device: 'push service')

      browser.update!(subscription_attributes: { endpoint: 'push:service' })
      expect(run(browser)).to include(device: 'push:service')
    end
  end

  describe 'mobile apps' do
    before do
      allow(GlobalConfigService).to receive(:load).and_call_original
      allow(GlobalConfigService).to receive(:load).with('FIREBASE_PROJECT_ID', nil).and_return(firebase_project)
      allow(GlobalConfigService).to receive(:load).with('FIREBASE_CREDENTIALS', nil).and_return('{}')
    end

    context 'with Firebase credentials' do
      let(:firebase_project) { 'project' }
      let(:fcm_client) { double }

      before do
        allow(Notification::FcmService).to receive(:new).with('project', '{}')
                                                        .and_return(instance_double(Notification::FcmService, fcm_client: fcm_client))
      end

      it 'sends through Firebase with the given title and body' do
        expect(fcm_client).to receive(:send_v1)
          .with(hash_including(token: 'token-987654', notification: { title: 'Hello', body: 'World' }))
          .and_return(status_code: 200, body: 'ok')

        expect(run(phone, title: 'Hello', body: 'World'))
          .to include(type: 'fcm', status: :success, message: 'HTTP 200 — ok', device: '…123456', token_tail: '…987654')
      end

      it 'reports Firebase errors' do
        allow(fcm_client).to receive(:send_v1).and_return({ status_code: 404, body: 'unregistered' })
        expect(run(phone)).to include(status: :failure, message: 'HTTP 404 — unregistered')

        allow(fcm_client).to receive(:send_v1).and_raise(StandardError, 'bad key')
        expect(run(phone)).to include(status: :failure, message: 'StandardError: bad key')
      end
    end

    context 'without Firebase credentials' do
      let(:firebase_project) { nil }

      it 'sends through the push relay' do
        allow(ChatwootHub).to receive(:send_push_with_response).and_return(instance_double(RestClient::Response, code: 200, body: 'queued'))

        expect(run(phone)).to include(type: 'fcm_via_hub', status: :success, message: 'HTTP 200 — queued')
      end

      it 'reports relay errors' do
        response = instance_double(RestClient::Response, code: 401, body: 'denied')
        allow(ChatwootHub).to receive(:send_push_with_response).and_raise(RestClient::Unauthorized.new(response))
        expect(run(phone)).to include(status: :failure, message: 'HTTP 401 — denied')

        allow(ChatwootHub).to receive(:send_push_with_response).and_raise(SocketError, 'offline')
        expect(run(phone)).to include(status: :failure, message: 'SocketError: offline')
      end

      it 'is skipped when the relay is turned off' do
        phone.update!(subscription_attributes: { push_token: 'token-987654' })

        with_modified_env ENABLE_PUSH_RELAY_SERVER: 'false' do
          expect(run(phone)).to include(status: :skipped, message: 'No Firebase credentials and push relay disabled', device: '—')
        end
      end
    end
  end

  it 'skips VoIP tokens and unknown devices' do
    voip = create(:notification_subscription, user: user, identifier: 'voip', subscription_type: 'apns_voip', subscription_attributes: {})
    other = create(:notification_subscription, user: user, identifier: 'other', subscription_attributes: {})
    other.update_column(:subscription_type, 9) # rubocop:disable Rails/SkipsModelValidations

    expect(run(voip)).to include(type: 'apns_voip', status: :skipped, token_tail: '—')
    expect(run(other.reload)).to include(status: :skipped, message: 'Unknown subscription type')
  end
end
