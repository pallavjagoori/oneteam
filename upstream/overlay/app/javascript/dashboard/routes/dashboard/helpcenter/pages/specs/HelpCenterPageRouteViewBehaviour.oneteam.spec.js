/**
 * OneTeam behaviour spec for the help center's outer page.
 *
 * Covers showing the help center or the upgrade page by feature flag,
 * picking the portal (from the address, the last used portal, or the
 * first one) and its locale (from the address or the portal default),
 * loading portals, the chosen portal, its categories and the agents,
 * and remembering a newly opened portal.
 */
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils';
import { reactive, ref } from 'vue';
import HelpCenterPageRouteView from '../HelpCenterPageRouteView.vue';

const route = reactive({ params: {} });
const uiSettings = ref({});
const updateUISettings = vi.fn();
const store = {
  enabled: true,
  portals: [],
  dispatch: vi.fn().mockResolvedValue(),
  get getters() {
    return {
      getCurrentAccountId: 3,
      'portals/allPortals': this.portals,
      'portals/portalBySlug': slug => ({
        slug,
        meta: slug === 'nometa' ? undefined : { default_locale: 'fr' },
      }),
      'accounts/isFeatureEnabledonAccount': (id, flag) =>
        id === 3 && flag === 'help_center' && store.enabled,
    };
  },
};

vi.mock('vue-router', () => ({ useRoute: () => route }));
vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => store,
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings, updateUISettings }),
}));

const mountView = async () => {
  const wrapper = mount(HelpCenterPageRouteView, {
    global: {
      stubs: {
        RouterView: { template: '<main class="help-center" />' },
        UpgradePage: { template: '<div class="upgrade" />' },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

// Every view watches the shared route, so earlier ones must go.
enableAutoUnmount(afterEach);

const showCalls = () =>
  store.dispatch.mock.calls.filter(([action]) => action === 'portals/show');

describe('HelpCenterPageRouteView behaviour', () => {
  beforeEach(() => {
    route.params = {};
    uiSettings.value = {};
    store.enabled = true;
    store.portals = [];
    vi.clearAllMocks();
  });

  it('shows the help center or the upgrade page', async () => {
    expect((await mountView()).find('.help-center').exists()).toBe(true);
    store.enabled = false;
    const wrapper = await mountView();
    expect(wrapper.find('.upgrade').exists()).toBe(true);
    expect(wrapper.find('.help-center').exists()).toBe(false);
  });

  it('loads the portal from the address', async () => {
    route.params = { portalSlug: 'docs', locale: 'de' };
    await mountView();
    expect(store.dispatch.mock.calls).toEqual([
      ['portals/index'],
      ['portals/show', { portalSlug: 'docs', locale: 'de' }],
      ['categories/index', { portalSlug: 'docs', locale: 'de' }],
      ['agents/get'],
    ]);
  });

  it('falls back to the last used portal and its default locale', async () => {
    uiSettings.value = { last_active_portal_slug: 'faq' };
    await mountView();
    expect(showCalls()).toEqual([
      ['portals/show', { portalSlug: 'faq', locale: 'fr' }],
    ]);

    uiSettings.value = { last_active_portal_slug: 'nometa' };
    store.dispatch.mockClear();
    await mountView();
    expect(showCalls()).toEqual([
      ['portals/show', { portalSlug: 'nometa', locale: undefined }],
    ]);
  });

  it('falls back to the first portal, or none', async () => {
    store.portals = [{ slug: 'first', meta: { default_locale: 'en' } }];
    await mountView();
    expect(showCalls()).toEqual([
      ['portals/show', { portalSlug: 'first', locale: 'en' }],
    ]);

    store.portals = [];
    store.dispatch.mockClear();
    await mountView();
    expect(showCalls()).toEqual([
      ['portals/show', { portalSlug: '', locale: '' }],
    ]);
  });

  it('remembers a newly opened portal', async () => {
    uiSettings.value = { last_active_portal_slug: 'docs' };
    route.params = { portalSlug: 'docs' };
    await mountView();

    route.params = { portalSlug: 'docs', locale: 'de' };
    await flushPromises();
    route.params = { portalSlug: 'faq', locale: 'es' };
    await flushPromises();
    route.params = {};
    await flushPromises();
    expect(updateUISettings.mock.calls).toEqual([
      [{ last_active_portal_slug: 'faq', last_active_locale_code: 'es' }],
    ]);
  });
});
