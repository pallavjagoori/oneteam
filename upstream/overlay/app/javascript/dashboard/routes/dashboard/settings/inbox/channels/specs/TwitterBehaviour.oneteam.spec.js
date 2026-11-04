/**
 * OneTeam behaviour spec for the Twitter channel sign in page.
 *
 * Covers redirecting to the authorization URL and alerting when the
 * request fails.
 */
import { mount, flushPromises } from '@vue/test-utils';
import Twitter from '../Twitter.vue';
import twitterClient from 'dashboard/api/channel/twitterClient';
import { useAlert } from 'dashboard/composables';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/channel/twitterClient', () => ({
  default: { generateAuthorization: vi.fn() },
}));

/**
 * Mounts the page.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = () =>
  mount(Twitter, {
    global: {
      mocks: { $t: key => key },
      stubs: { NextButton: { template: '<button type="submit" />' } },
    },
  });

describe('Twitter channel behaviour', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { href: '' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects to the authorization url', async () => {
    twitterClient.generateAuthorization.mockResolvedValue({
      data: { url: 'https://x.com/auth' },
    });
    const wrapper = mountPage();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(window.location.href).toBe('https://x.com/auth');
    expect(wrapper.vm.isRequestingAuthorization).toBe(false);
  });

  it('alerts when authorization fails', async () => {
    twitterClient.generateAuthorization.mockRejectedValue(new Error('no'));
    const wrapper = mountPage();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.ADD.TWITTER.ERROR_MESSAGE'
    );
  });
});
