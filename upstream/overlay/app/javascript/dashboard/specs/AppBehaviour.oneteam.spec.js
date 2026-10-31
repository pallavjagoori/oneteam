/**
 * OneTeam behaviour spec for the dashboard root App component.
 *
 * Covers the loading state, banners (hidden on onboarding views or
 * without an account), RTL direction, colour theme set-up and system
 * theme changes, locale choice (user setting, then account, then the
 * page config), account start-up (realtime, reconnect service and push
 * subscription re-registration) and disconnecting on unmount.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import vueActionCable from 'dashboard/helper/actionCable';
import { setColorTheme } from 'dashboard/helper/themeHelper';
import {
  registerSubscription,
  verifyServiceWorkerExistence,
} from 'dashboard/helper/pushHelper';
import App from '../App.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store', () => ({ useStore: () => env.store }));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ accountId: env.accountId }),
}));
vi.mock('dashboard/composables/useFontSize', () => ({
  useFontSize: () => ({ currentFontSize: ref(16) }),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings: env.uiSettings }),
}));
vi.mock('dashboard/helper/themeHelper', () => ({ setColorTheme: vi.fn() }));
vi.mock('v3/helpers/RouteHelper', () => ({
  isOnOnboardingView: route => route.name === 'onboarding',
}));
vi.mock('dashboard/helper/actionCable', () => ({ default: { init: vi.fn() } }));
vi.mock('dashboard/helper/pushHelper', () => ({
  registerSubscription: vi.fn(),
  verifyServiceWorkerExistence: vi.fn(),
}));
vi.mock('dashboard/helper/ReconnectService', () => ({
  default: class {
    constructor(store, router) {
      this.store = store;
      this.router = router;
      this.disconnect = vi.fn();
    }
  },
}));

const BANNERS = [
  'PendingEmailVerificationBanner',
  'PaymentPendingBanner',
  'LowBackupCodesBanner',
  'FeatureAnnouncement',
];

let mql;

const mountApp = async ({
  accountId = 1,
  isFetching = false,
  rtl = false,
  routeName = 'home',
  uiLocale,
  user = { pubsub_token: 'tok' },
} = {}) => {
  env.router = { push: vi.fn() };
  env.store = { name: 'composable-store' };
  env.accountId = ref(accountId);
  env.uiSettings = ref(uiLocale ? { locale: uiLocale } : {});
  const $store = {
    dispatch: vi.fn().mockResolvedValue(),
    getters: {
      'accounts/getAccount': () => ({
        locale: 'fr',
        latest_chatwoot_version: '9.9.9',
      }),
      'accounts/isRTL': rtl,
      getCurrentUser: user,
      getAuthUIFlags: { isFetching },
    },
  };
  const i18n = { locale: 'en' };
  const wrapper = mount(App, {
    global: {
      stubs: {
        LoadingState: { template: '<div class="loading" />' },
        UpdateBanner: {
          name: 'UpdateBanner',
          props: ['latestChatwootVersion'],
          template: '<div />',
        },
        RouterView: {
          template: '<div class="view"><slot :Component="null" /></div>',
        },
        ...Object.fromEntries(
          [
            'ImpersonationBanner',
            'StatusBanner',
            'WootSnackbarBox',
            'NetworkNotification',
            ...BANNERS,
          ].map(n => [n, { name: n, template: `<i class="${n}" />` }])
        ),
      },
      mocks: { $store, $route: { name: routeName }, $i18n: i18n },
    },
  });
  await flushPromises();
  return { wrapper, $store, i18n };
};

describe('Dashboard App behaviour', () => {
  beforeEach(() => {
    mql = { matches: true, onchange: null };
    window.matchMedia = vi.fn(() => mql);
    window.chatwootConfig = { selectedLocale: 'de' };
  });

  afterEach(() => {
    delete window.matchMedia;
    delete window.reconnectService;
  });

  it('shows the loading state while auth is fetching', async () => {
    const { wrapper } = await mountApp({ isFetching: true });
    expect(wrapper.find('.loading').exists()).toBe(true);
    expect(wrapper.find('#app').exists()).toBe(false);
  });

  it('starts the account and renders banners', async () => {
    verifyServiceWorkerExistence.mockImplementation(cb =>
      cb({
        pushManager: {
          getSubscription: () => Promise.resolve({ endpoint: 'x' }),
        },
      })
    );
    const { wrapper, $store, i18n } = await mountApp();
    expect($store.dispatch).toHaveBeenCalledWith('accounts/get');
    expect($store.dispatch).toHaveBeenCalledWith('setActiveAccount', {
      accountId: 1,
    });
    expect(vueActionCable.init).toHaveBeenCalledWith(env.store, 'tok');
    expect(window.reconnectService.router.push).toBe(env.router.push);
    expect(registerSubscription).toHaveBeenCalled();
    expect(i18n.locale).toBe('fr');
    expect(
      wrapper
        .findComponent({ name: 'UpdateBanner' })
        .props('latestChatwootVersion')
    ).toBe('9.9.9');
    BANNERS.forEach(name =>
      expect(wrapper.find(`.${name}`).exists()).toBe(true)
    );
    expect(wrapper.find('#app').attributes('dir')).toBe('ltr');
    expect(wrapper.find('.view').exists()).toBe(true);

    const service = window.reconnectService;
    wrapper.unmount();
    expect(service.disconnect).toHaveBeenCalled();
  });

  it('skips push registration without a subscription and prefers the user locale', async () => {
    verifyServiceWorkerExistence.mockImplementation(cb =>
      cb({ pushManager: { getSubscription: () => Promise.resolve(null) } })
    );
    const { i18n } = await mountApp({ uiLocale: 'es', user: null, rtl: true });
    expect(registerSubscription).not.toHaveBeenCalled();
    expect(vueActionCable.init).toHaveBeenCalledWith(env.store, undefined);
    expect(i18n.locale).toBe('es');
  });

  it('hides account banners on onboarding views and without an account', async () => {
    const { wrapper } = await mountApp({ routeName: 'onboarding', rtl: true });
    BANNERS.forEach(name =>
      expect(wrapper.find(`.${name}`).exists()).toBe(false)
    );
    expect(wrapper.find('#app').attributes('dir')).toBe('rtl');

    const {
      wrapper: noAccount,
      $store,
      i18n,
    } = await mountApp({ accountId: null });
    expect($store.dispatch).not.toHaveBeenCalled();
    expect(noAccount.find('.PaymentPendingBanner').exists()).toBe(false);
    expect(i18n.locale).toBe('de');
    noAccount.unmount();
  });

  it('keeps the locale when none is configured', async () => {
    window.chatwootConfig = {};
    const { i18n } = await mountApp({ accountId: null });
    expect(i18n.locale).toBe('en');
  });

  it('applies and follows the system colour theme', async () => {
    await mountApp({ accountId: null });
    expect(setColorTheme).toHaveBeenCalledWith(true);
    mql.onchange({ matches: false });
    expect(setColorTheme).toHaveBeenLastCalledWith(false);
  });
});
