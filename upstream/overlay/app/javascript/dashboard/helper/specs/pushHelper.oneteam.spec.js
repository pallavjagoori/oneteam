import NotificationSubscriptions from '../../api/notificationSubscription';
import auth from '../../api/auth';
import { useAlert } from 'dashboard/composables';
import {
  getPushSubscriptionPayload,
  hasPushPermissions,
  registerSubscription,
  requestPushPermissions,
  sendRegistrationToServer,
  verifyServiceWorkerExistence,
} from '../pushHelper';

vi.mock('../../api/notificationSubscription', () => ({
  default: { create: vi.fn(() => Promise.resolve()) },
}));
vi.mock('../../api/auth', () => ({ default: { hasAuthCookie: vi.fn() } }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const flush = () =>
  new Promise(resolve => {
    setTimeout(resolve, 0);
  });
const subscription = {
  endpoint: 'https://push.example.com/1',
  getKey: () => new Uint8Array([251, 255]).buffer,
};

describe('pushHelper (OneTeam)', () => {
  const originalNotification = window.Notification;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.chatwootConfig = { vapidPublicKey: 'key' };
  });

  afterEach(() => {
    delete navigator.serviceWorker;
    delete window.PushManager;
    window.Notification = originalNotification;
    if (!originalNotification) delete window.Notification;
    delete window.chatwootConfig;
    vi.restoreAllMocks();
  });

  describe('verifyServiceWorkerExistence', () => {
    it('stops when service workers are not supported', () => {
      const callback = vi.fn();
      verifyServiceWorkerExistence(callback);
      expect(callback).not.toHaveBeenCalled();
    });

    it('stops when push is not supported', () => {
      navigator.serviceWorker = { register: vi.fn() };
      verifyServiceWorkerExistence();
      expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
    });

    it('registers the service worker and passes the registration on', async () => {
      window.PushManager = {};
      navigator.serviceWorker = {
        register: vi.fn(() => Promise.resolve('registration')),
      };
      const callback = vi.fn();
      verifyServiceWorkerExistence(callback);
      await flush();
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
      expect(callback).toHaveBeenCalledWith('registration');
    });

    it('logs a failed registration, with a no-op default callback', async () => {
      window.PushManager = {};
      navigator.serviceWorker = {
        register: vi.fn(() => Promise.reject(new Error('no'))),
      };
      verifyServiceWorkerExistence();
      await flush();
      // eslint-disable-next-line no-console
      expect(console.log).toHaveBeenCalled();

      navigator.serviceWorker.register = vi.fn(() => Promise.resolve('r'));
      verifyServiceWorkerExistence();
      await flush();
    });
  });

  it('checks for push permission', () => {
    delete window.Notification;
    expect(hasPushPermissions()).toBe(false);
    window.Notification = { permission: 'granted' };
    expect(hasPushPermissions()).toBe(true);
  });

  it('builds the subscription payload with URL-safe keys', () => {
    expect(getPushSubscriptionPayload(subscription)).toEqual({
      subscription_type: 'browser_push',
      subscription_attributes: {
        endpoint: 'https://push.example.com/1',
        p256dh: '-_8=',
        auth: '-_8=',
      },
    });
  });

  it('sends the subscription only when signed in', () => {
    auth.hasAuthCookie.mockReturnValue(false);
    expect(sendRegistrationToServer(subscription)).toBeNull();
    auth.hasAuthCookie.mockReturnValue(true);
    sendRegistrationToServer(subscription);
    expect(NotificationSubscriptions.create).toHaveBeenCalled();
  });

  describe('registerSubscription', () => {
    const readyWith = pushManager => {
      navigator.serviceWorker = { ready: Promise.resolve({ pushManager }) };
    };

    it('does nothing without a VAPID key', () => {
      window.chatwootConfig = {};
      readyWith({ subscribe: vi.fn() });
      registerSubscription();
    });

    it('subscribes and reports success', async () => {
      auth.hasAuthCookie.mockReturnValue(false);
      const subscribe = vi.fn(() => Promise.resolve(subscription));
      readyWith({ subscribe });
      const onSuccess = vi.fn();
      registerSubscription(onSuccess);
      await flush();
      expect(subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: 'key',
      });
      expect(onSuccess).toHaveBeenCalled();

      readyWith({ subscribe });
      registerSubscription();
      await flush();
    });

    it('alerts when subscribing fails', async () => {
      readyWith({ subscribe: vi.fn(() => Promise.reject(new Error('no'))) });
      registerSubscription();
      await flush();
      expect(useAlert).toHaveBeenCalledWith(
        'This browser does not support desktop notification'
      );
    });
  });

  describe('requestPushPermissions', () => {
    const subscribe = vi.fn(() => Promise.resolve(subscription));

    beforeEach(() => {
      auth.hasAuthCookie.mockReturnValue(false);
      navigator.serviceWorker = {
        ready: Promise.resolve({ pushManager: { subscribe } }),
      };
    });

    it('alerts when notifications are not supported', () => {
      delete window.Notification;
      requestPushPermissions({ onSuccess: vi.fn() });
      expect(useAlert).toHaveBeenCalled();
    });

    it('subscribes straight away when permission was granted', async () => {
      window.Notification = { permission: 'granted' };
      const onSuccess = vi.fn();
      requestPushPermissions({ onSuccess });
      await flush();
      expect(onSuccess).toHaveBeenCalled();
    });

    it('asks for permission, and subscribes only if granted', async () => {
      const onSuccess = vi.fn();
      window.Notification = {
        permission: 'default',
        requestPermission: vi.fn(callback => callback('denied')),
      };
      requestPushPermissions({ onSuccess });
      await flush();
      expect(onSuccess).not.toHaveBeenCalled();

      window.Notification.requestPermission = vi.fn(callback =>
        callback('granted')
      );
      requestPushPermissions({ onSuccess });
      await flush();
      expect(onSuccess).toHaveBeenCalled();
    });

    it('does nothing when permission was denied', () => {
      window.Notification = {
        permission: 'denied',
        requestPermission: vi.fn(),
      };
      requestPushPermissions({ onSuccess: vi.fn() });
      expect(window.Notification.requestPermission).not.toHaveBeenCalled();
    });
  });
});
