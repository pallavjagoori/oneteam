/**
 * OneTeam behaviour spec for reauthorizing a Microsoft inbox.
 *
 * Covers requesting a new authorization for the inbox email, redirecting to
 * Microsoft, and the error alert.
 */
import { flushPromises, mount } from '@vue/test-utils';
import Reauthorize from '../Reauthorize.vue';

const env = vi.hoisted(() => ({ authorize: vi.fn(), alerts: [] }));

vi.mock('dashboard/api/channel/microsoftClient', () => ({
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
const reauthorize = async () => {
  const wrapper = mount(Reauthorize, {
    props: { inbox: { email: 'a@x.io' } },
    global: { stubs: { InboxReconnectionRequired: Reconnect } },
  });
  await wrapper.findComponent(Reconnect).vm.$emit('reauthorize');
  await flushPromises();
};

describe('Microsoft Reauthorize behaviour', () => {
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

  it('redirects to the authorization url', async () => {
    env.authorize = vi
      .fn()
      .mockResolvedValue({ data: { url: 'https://auth' } });
    await reauthorize();
    expect(env.authorize).toHaveBeenCalledWith({ email: 'a@x.io' });
    expect(window.location.href).toBe('https://auth');
  });

  it('alerts when authorization fails', async () => {
    env.authorize = vi.fn().mockRejectedValue(new Error('no'));
    await reauthorize();
    expect(env.alerts).toEqual(['INBOX_MGMT.ADD.MICROSOFT.ERROR_MESSAGE']);
  });
});
