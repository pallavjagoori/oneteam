/**
 * OneTeam behaviour spec for reconnecting a Facebook page inbox.
 *
 * Covers registering the SDK init hook, loading the SDK and initialising
 * it, requesting the right scopes (with Instagram scopes for linked
 * Instagram accounts), reauthorising on a connected login (success and
 * failure), the not-authorised and unknown login results, and SDK load
 * versus other errors (reported to Sentry).
 */
import { flushPromises, mount } from '@vue/test-utils';
import * as Sentry from '@sentry/vue';
import { useAlert } from 'dashboard/composables';
import { loadScript } from 'dashboard/helper/DOMHelpers';
import { buildFacebookLoginScopes } from 'dashboard/helper/facebookScopes';
import Reauthorize from '../Reauthorize.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/helper/DOMHelpers', () => ({ loadScript: vi.fn() }));
vi.mock('dashboard/helper/facebookScopes', () => ({
  buildFacebookLoginScopes: vi.fn(({ includeInstagramScopes }) =>
    includeInstagramScopes ? 'pages,instagram' : 'pages'
  ),
}));
vi.mock('@sentry/vue', () => ({ captureException: vi.fn() }));

const Reconnect = {
  name: 'InboxReconnectionRequired',
  emits: ['reauthorize'],
  template: '<div class="reconnect" />',
};

const mountPage = async (inbox = { id: 4 }) => {
  env.dispatch = vi.fn().mockResolvedValue();
  window.chatwootConfig = { fbAppId: 'app-1', fbApiVersion: 'v19.0' };
  window.FB = {
    init: vi.fn(),
    AppEvents: { logPageView: vi.fn() },
    login: vi.fn(callback => callback(env.loginResponse)),
  };
  const wrapper = mount(Reauthorize, {
    props: { inbox },
    global: {
      stubs: { InboxReconnectionRequired: Reconnect },
      mocks: { $t: key => key, $store: { dispatch: env.dispatch } },
    },
  });
  await flushPromises();
  return wrapper;
};
const reconnect = async wrapper => {
  wrapper.findComponent(Reconnect).vm.$emit('reauthorize');
  await flushPromises();
};

afterEach(() => {
  delete window.FB;
  delete window.fbAsyncInit;
  delete window.fbSDKLoaded;
  delete window.chatwootConfig;
});

describe('Reauthorize behaviour', () => {
  it('registers the SDK init hook', async () => {
    const wrapper = await mountPage();
    window.fbAsyncInit();
    expect(window.FB.init).toHaveBeenCalledWith({
      appId: 'app-1',
      xfbml: true,
      version: 'v19.0',
      status: true,
    });
    expect(window.fbSDKLoaded).toBe(true);
    expect(window.FB.AppEvents.logPageView).toHaveBeenCalled();
    expect(wrapper.find('.reconnect').exists()).toBe(true);
  });

  it('reauthorises the page after a connected login', async () => {
    loadScript.mockResolvedValue();
    env.loginResponse = {
      status: 'connected',
      authResponse: { accessToken: 'tok' },
    };
    const wrapper = await mountPage();
    await reconnect(wrapper);
    expect(loadScript).toHaveBeenCalledWith(
      'https://connect.facebook.net/en_US/sdk.js',
      { id: 'facebook-jssdk' }
    );
    expect(window.FB.init).toHaveBeenCalled();
    expect(window.FB.login).toHaveBeenCalledWith(expect.any(Function), {
      scope: 'pages',
      auth_type: 'reauthorize',
    });
    expect(env.dispatch).toHaveBeenCalledWith(
      'inboxes/reauthorizeFacebookPage',
      { omniauthToken: 'tok', inboxId: 4 }
    );
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.FACEBOOK_REAUTHORIZE.MESSAGE_SUCCESS'
    );
  });

  it('requests Instagram scopes and reports reauthorise failures', async () => {
    loadScript.mockResolvedValue();
    env.loginResponse = {
      status: 'connected',
      authResponse: { accessToken: 'tok' },
    };
    const wrapper = await mountPage({ id: 4, instagram_id: 'ig' });
    env.dispatch.mockRejectedValue(new Error('expired'));
    await reconnect(wrapper);
    expect(buildFacebookLoginScopes).toHaveBeenCalledWith({
      includeInstagramScopes: true,
    });
    expect(window.FB.login.mock.calls[0][1].scope).toBe('pages,instagram');
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.FACEBOOK_REAUTHORIZE.MESSAGE_ERROR'
    );
  });

  it.each(['not_authorized', 'unknown'])(
    'alerts when the login is %s',
    async status => {
      loadScript.mockResolvedValue();
      env.loginResponse = { status };
      const wrapper = await mountPage();
      await reconnect(wrapper);
      expect(env.dispatch).not.toHaveBeenCalled();
      expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.DETAILS.ERROR_FB_AUTH');
    }
  );

  it('alerts when the SDK fails to load', async () => {
    const error = new Error('blocked');
    error.name = 'ScriptLoaderError';
    loadScript.mockRejectedValue(error);
    const wrapper = await mountPage();
    await reconnect(wrapper);
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.DETAILS.ERROR_FB_LOADING'
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('reports other errors to Sentry', async () => {
    const error = new Error('boom');
    loadScript.mockRejectedValue(error);
    const wrapper = await mountPage();
    await reconnect(wrapper);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.DETAILS.ERROR_FB_AUTH');
  });
});
