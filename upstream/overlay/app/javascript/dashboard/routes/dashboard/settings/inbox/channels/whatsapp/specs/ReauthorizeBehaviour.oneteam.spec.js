/**
 * OneTeam behaviour spec for the WhatsApp Cloud reauthorization banner.
 *
 * The Facebook SDK login and the reauthorize API are mocked; Meta's
 * embedded-signup postMessages are delivered straight to the window
 * listeners the component registers, in either order relative to the
 * login result, to cover both the existing-config shortcut and the full
 * embedded signup flow.
 */
import { shallowMount, flushPromises } from '@vue/test-utils';
import Reauthorize from '../Reauthorize.vue';
import InboxReconnectionRequired from '../../../components/InboxReconnectionRequired.vue';

const env = vi.hoisted(() => ({ login: null, setup: null, reauth: null }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/channel/whatsappChannel', () => ({
  default: { reauthorizeWhatsApp: vi.fn(params => env.reauth(params)) },
}));
vi.mock('../utils', async importOriginal => ({
  ...(await importOriginal()),
  setupFacebookSdk: vi.fn(() => env.setup()),
  initWhatsAppEmbeddedSignup: vi.fn(() => env.login()),
}));

const { useAlert } = await import('dashboard/composables');
const { default: whatsappChannel } = await import(
  'dashboard/api/channel/whatsappChannel'
);

let listeners;

// Delivers an embedded-signup payload to every live message listener.
const fb = (event, extra = {}) =>
  [...listeners].forEach(listener =>
    listener({
      origin: 'https://www.facebook.com',
      data: { type: 'WA_EMBEDDED_SIGNUP', event, ...extra },
    })
  );

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const existingInbox = {
  id: 7,
  provider_config: { business_account_id: 'waba1', phone_number_id: 'ph1' },
};

const mountBanner = async ({ inbox = { id: 7 }, ...props } = {}) => {
  const wrapper = shallowMount(Reauthorize, { props: { inbox, ...props } });
  await flushPromises();
  return wrapper;
};
const banner = wrapper => wrapper.findComponent(InboxReconnectionRequired);
const reauthorize = async wrapper => {
  banner(wrapper).vm.$emit('reauthorize');
  await flushPromises();
};

beforeEach(() => {
  listeners = new Set();
  vi.spyOn(window, 'addEventListener').mockImplementation((type, fn) => {
    if (type === 'message') listeners.add(fn);
  });
  vi.spyOn(window, 'removeEventListener').mockImplementation((type, fn) => {
    if (type === 'message') listeners.delete(fn);
  });
  window.chatwootConfig = {
    whatsappAppId: 'app',
    whatsappConfigurationId: 'cfg',
    whatsappApiVersion: 'v22.0',
  };
  env.setup = () => Promise.resolve();
  env.login = () => Promise.resolve('code1');
  env.reauth = () => Promise.resolve({ data: { success: true } });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Reauthorize setup', () => {
  it('loads the Facebook SDK with the configured version', async () => {
    const { setupFacebookSdk } = await import('../utils');
    const wrapper = await mountBanner();
    expect(setupFacebookSdk).toHaveBeenCalledWith('app', 'v22.0');
    expect(banner(wrapper).props()).toMatchObject({
      isLoading: false,
      actionLabel: '',
      description: '',
    });
  });

  it('labels the banner for incomplete registrations', async () => {
    const wrapper = await mountBanner({ whatsappRegistrationIncomplete: true });
    expect(banner(wrapper).props()).toMatchObject({
      actionLabel: 'INBOX_MGMT.COMPLETE_REGISTRATION',
      description: 'INBOX_MGMT.WHATSAPP_REGISTRATION_INCOMPLETE',
    });
  });

  it('asks to wait while the SDK is still loading', async () => {
    env.setup = () => new Promise(() => {});
    const wrapper = shallowMount(Reauthorize, { props: { inbox: { id: 7 } } });
    await reauthorize(wrapper);
    expect(useAlert).toHaveBeenCalledWith('INBOX.REAUTHORIZE.LOADING_FACEBOOK');
  });

  it('alerts when the SDK fails to load', async () => {
    env.setup = () => Promise.reject(new Error('x'));
    await mountBanner();
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX.REAUTHORIZE.FACEBOOK_LOAD_ERROR'
    );
  });

  it.each([
    [
      { whatsappAppId: '' },
      'INBOX.REAUTHORIZE.WHATSAPP_APP_ID_MISSING',
      'WhatsApp App ID is required',
    ],
    [
      { whatsappConfigurationId: '' },
      'INBOX.REAUTHORIZE.WHATSAPP_CONFIG_ID_MISSING',
      'WhatsApp Configuration ID is required',
    ],
  ])('reports missing config %o', async (config, mountAlert, clickAlert) => {
    Object.assign(window.chatwootConfig, config);
    const wrapper = await mountBanner();
    expect(useAlert).toHaveBeenCalledWith(mountAlert);
    await reauthorize(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(clickAlert);
    expect(banner(wrapper).props('isLoading')).toBe(false);
  });

  it('falls back to the configuration error without a message', async () => {
    const wrapper = await mountBanner();
    window.chatwootConfig = {
      get whatsappAppId() {
        throw new Error('');
      },
    };
    await reauthorize(wrapper);
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX.REAUTHORIZE.CONFIGURATION_ERROR'
    );
  });

  it('exposes requestAuthorization to the parent', async () => {
    const wrapper = await mountBanner({ inbox: existingInbox });
    const pending = wrapper.vm.requestAuthorization();
    await flushPromises();
    fb('FINISH');
    await pending;
    expect(whatsappChannel.reauthorizeWhatsApp).toHaveBeenCalled();
  });
});

describe('Reauthorize with stored business details', () => {
  it.each([
    ['FINISH', false],
    ['FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', true],
  ])('reauthorizes after %s', async (event, isCoexistence) => {
    const wrapper = await mountBanner({ inbox: existingInbox });
    await reauthorize(wrapper);
    expect(banner(wrapper).props('isLoading')).toBe(true);
    fb('PROGRESS');
    fb(event);
    await flushPromises();
    expect(whatsappChannel.reauthorizeWhatsApp).toHaveBeenCalledWith({
      inboxId: 7,
      code: 'code1',
      business_id: 'waba1',
      waba_id: 'waba1',
      phone_number_id: 'ph1',
      is_coexistence: isCoexistence,
    });
    expect(useAlert).toHaveBeenCalledWith('INBOX.REAUTHORIZE.SUCCESS');
    expect(banner(wrapper).props('isLoading')).toBe(false);
    expect(listeners.size).toBe(0);
  });

  it.each([
    [
      'FINISH_ONLY_WABA',
      {},
      'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.UNSUPPORTED_COMPLETION',
    ],
    ['CANCEL', {}, 'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.CANCELLED'],
    ['ERROR', { error_message: 'Meta said no' }, 'Meta said no'],
    ['ERROR', {}, 'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.SIGNUP_ERROR'],
  ])('stops on %s', async (event, extra, message) => {
    const wrapper = await mountBanner({ inbox: existingInbox });
    await reauthorize(wrapper);
    fb(event, extra);
    await flushPromises();
    expect(whatsappChannel.reauthorizeWhatsApp).not.toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(banner(wrapper).props('isLoading')).toBe(false);
  });

  it.each([
    [{ data: { success: false, message: 'Token expired' } }, 'Token expired'],
    [{ data: { success: false } }, 'INBOX.REAUTHORIZE.ERROR'],
  ])('reports an unsuccessful API answer', async (response, message) => {
    env.reauth = () => Promise.resolve(response);
    const wrapper = await mountBanner({ inbox: existingInbox });
    await reauthorize(wrapper);
    fb('FINISH');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
  });

  it.each([
    [new Error('Network down'), 'Network down'],
    [new Error(''), 'INBOX.REAUTHORIZE.ERROR'],
  ])('reports an API failure', async (error, message) => {
    env.reauth = () => Promise.reject(error);
    const wrapper = await mountBanner({ inbox: existingInbox });
    await reauthorize(wrapper);
    fb('FINISH');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(banner(wrapper).props('isLoading')).toBe(false);
  });

  it.each([
    [
      new Error('Login cancelled'),
      'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.CANCELLED',
    ],
    [new Error('Popup blocked'), 'Popup blocked'],
    [
      new Error(''),
      'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.AUTH_NOT_COMPLETED',
    ],
  ])('cleans up when login fails with %s', async (error, message) => {
    env.login = () => Promise.reject(error);
    const wrapper = await mountBanner({ inbox: existingInbox });
    await reauthorize(wrapper);
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(listeners.size).toBe(0);
    expect(banner(wrapper).props('isLoading')).toBe(false);
  });

  it('runs the full signup when the stored config is incomplete', async () => {
    const wrapper = await mountBanner({
      inbox: { id: 7, provider_config: { business_account_id: 'waba1' } },
    });
    await reauthorize(wrapper);
    // Still waiting on Meta's FINISH message.
    expect(banner(wrapper).props('isLoading')).toBe(true);
    expect(whatsappChannel.reauthorizeWhatsApp).not.toHaveBeenCalled();
  });
});

describe('Reauthorize with the embedded signup', () => {
  const business = { waba_id: 'waba9' };

  it('reauthorizes once both the code and FINISH have arrived', async () => {
    const wrapper = await mountBanner();
    await reauthorize(wrapper);
    expect(banner(wrapper).props('isLoading')).toBe(true);
    fb('PROGRESS');
    fb('FINISH', {
      data: { business_id: 'b1', waba_id: 'waba9', phone_number_id: 'p9' },
    });
    await flushPromises();
    expect(whatsappChannel.reauthorizeWhatsApp).toHaveBeenCalledWith({
      inboxId: 7,
      code: 'code1',
      business_id: 'b1',
      waba_id: 'waba9',
      phone_number_id: 'p9',
      is_coexistence: false,
    });
    expect(listeners.size).toBe(0);
    expect(banner(wrapper).props('isLoading')).toBe(false);
  });

  it('buffers an early FINISH and keeps the first one', async () => {
    const login = deferred();
    env.login = () => login.promise;
    const wrapper = await mountBanner();
    await reauthorize(wrapper);
    fb('FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', { data: business });
    fb('FINISH', { data: { waba_id: 'other' } });
    expect(whatsappChannel.reauthorizeWhatsApp).not.toHaveBeenCalled();
    login.resolve('late');
    await flushPromises();
    expect(whatsappChannel.reauthorizeWhatsApp).toHaveBeenCalledWith({
      inboxId: 7,
      code: 'late',
      business_id: '',
      waba_id: 'waba9',
      phone_number_id: '',
      is_coexistence: true,
    });
  });

  it('rejects FINISH events without business data', async () => {
    const wrapper = await mountBanner();
    await reauthorize(wrapper);
    fb('FINISH', { data: {} });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.INVALID_BUSINESS_DATA'
    );
    expect(banner(wrapper).props('isLoading')).toBe(false);
  });

  it.each([
    [
      'FINISH_OBO_MIGRATION',
      {},
      'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.UNSUPPORTED_COMPLETION',
    ],
    ['CANCEL', {}, 'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.CANCELLED'],
    ['CANCEL', { error_message: 'Number in use' }, 'Number in use'],
    ['error', {}, 'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.SIGNUP_ERROR'],
  ])('ends the flow on %s', async (event, extra, message) => {
    const wrapper = await mountBanner();
    await reauthorize(wrapper);
    fb(event, extra);
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(listeners.size).toBe(0);
    expect(banner(wrapper).props('isLoading')).toBe(false);
  });

  it('cleans up once when Meta cancels before the login rejects', async () => {
    const login = deferred();
    env.login = () => login.promise;
    const wrapper = await mountBanner();
    await reauthorize(wrapper);
    fb('CANCEL');
    login.reject(new Error('Login cancelled'));
    await flushPromises();
    expect(listeners.size).toBe(0);
    expect(
      useAlert.mock.calls.filter(
        ([m]) => m === 'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.CANCELLED'
      )
    ).toHaveLength(2);
  });

  it('removes the listener when the login fails first', async () => {
    env.login = () => Promise.reject(new Error('Popup blocked'));
    const wrapper = await mountBanner();
    await reauthorize(wrapper);
    expect(listeners.size).toBe(0);
    expect(useAlert).toHaveBeenCalledWith('Popup blocked');
  });
});
