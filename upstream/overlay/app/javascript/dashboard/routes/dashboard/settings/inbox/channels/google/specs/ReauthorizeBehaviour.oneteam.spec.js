/**
 * OneTeam behaviour spec for reauthorizing a Google email inbox.
 *
 * Covers using the IMAP login when IMAP is on, falling back to the inbox
 * email otherwise, redirecting to Google, and the error alert.
 */
import { flushPromises, mount } from '@vue/test-utils';
import Reauthorize from '../Reauthorize.vue';

const env = vi.hoisted(() => ({ authorize: vi.fn(), alerts: [] }));

vi.mock('dashboard/api/channel/googleClient', () => ({
  default: { generateAuthorization: args => env.authorize(args) },
}));
vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));

const Reconnect = {
  name: 'InboxReconnectionRequired',
  emits: ['reauthorize'],
  template: '<div />',
};
const reauthorize = async inbox => {
  const wrapper = mount(Reauthorize, {
    props: inbox ? { inbox } : {},
    global: { stubs: { InboxReconnectionRequired: Reconnect } },
  });
  await wrapper.findComponent(Reconnect).vm.$emit('reauthorize');
  await flushPromises();
};

describe('Google Reauthorize behaviour', () => {
  let realLocation;
  beforeAll(() => {
    realLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });
  });
  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: realLocation,
    });
  });

  it('picks the login email and redirects', async () => {
    env.authorize = vi.fn().mockResolvedValue({ data: { url: 'https://g' } });
    await reauthorize({
      email: 'inbox@x.io',
      imap_login: 'login@x.io',
      imap_enabled: true,
    });
    await reauthorize({ email: 'inbox@x.io', imap_login: 'login@x.io' });
    await reauthorize();
    expect(env.authorize.mock.calls.map(([args]) => args.email)).toEqual([
      'login@x.io',
      'inbox@x.io',
      undefined,
    ]);
    expect(window.location.href).toBe('https://g');
  });

  it('alerts when Google refuses', async () => {
    env.authorize = vi.fn().mockRejectedValue(new Error('no'));
    await reauthorize({ email: 'a@x.io' });
    expect(env.alerts).toEqual(['INBOX_MGMT.ADD.GOOGLE.ERROR_MESSAGE']);
  });
});
