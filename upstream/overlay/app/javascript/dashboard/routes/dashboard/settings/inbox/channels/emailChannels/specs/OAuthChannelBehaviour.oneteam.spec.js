/**
 * OneTeam behaviour spec for the Microsoft and Google OAuth email channel
 * screen.
 *
 * Covers the header text, sending the user to the provider's consent page
 * for each provider, and the error alert when authorization fails.
 */
import { flushPromises, mount } from '@vue/test-utils';
import OAuthChannel from '../OAuthChannel.vue';

const env = vi.hoisted(() => ({
  microsoft: vi.fn(),
  google: vi.fn(),
  alerts: [],
}));

vi.mock('dashboard/api/channel/microsoftClient', () => ({
  default: { generateAuthorization: () => env.microsoft() },
}));
vi.mock('dashboard/api/channel/googleClient', () => ({
  default: { generateAuthorization: () => env.google() },
}));
vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));

const Header = {
  name: 'SettingsSubPageHeader',
  props: ['headerTitle', 'headerContent'],
  template: '<header />',
};

const mountChannel = provider =>
  mount(OAuthChannel, {
    props: {
      provider,
      title: 'Connect',
      description: 'Sign in',
      submitButtonText: 'Go',
      errorMessage: 'Failed',
    },
    global: {
      stubs: {
        SettingsSubPageHeader: Header,
        NextButton: { template: '<button type="submit" />' },
      },
    },
  });

describe('OAuthChannel behaviour', () => {
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
  beforeEach(() => {
    env.alerts = [];
  });

  it('redirects to each provider', async () => {
    env.microsoft = vi.fn().mockResolvedValue({ data: { url: 'https://ms' } });
    env.google = vi.fn().mockResolvedValue({ data: { url: 'https://g' } });
    const microsoft = mountChannel('microsoft');
    expect(microsoft.findComponent(Header).props()).toEqual({
      headerTitle: 'Connect',
      headerContent: 'Sign in',
    });
    await microsoft.find('form').trigger('submit');
    await flushPromises();
    expect(window.location.href).toBe('https://ms');

    await mountChannel('google').find('form').trigger('submit');
    await flushPromises();
    expect(window.location.href).toBe('https://g');
  });

  it('alerts when authorization fails', async () => {
    env.google = vi.fn().mockRejectedValue(new Error('no'));
    await mountChannel('google').find('form').trigger('submit');
    await flushPromises();
    expect(env.alerts).toEqual(['Failed']);
  });
});
