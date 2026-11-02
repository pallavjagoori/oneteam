/**
 * OneTeam behaviour spec for the help center landing route, which only
 * loads portals and forwards the agent.
 *
 * Covers reopening the last active portal and locale, falling back to
 * the first portal (with or without a default locale), keeping a valid
 * sub-page from the URL (and ignoring an unknown one), and sending the
 * agent to create a portal when there are none.
 */
import { flushPromises, mount } from '@vue/test-utils';
import PortalsIndexPage from '../PortalsIndexPage.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => env.store,
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => ({ replace: env.replace }),
}));
vi.mock('dashboard/composables/useUISettings', async () => {
  const { computed } = await import('vue');
  return {
    useUISettings: () => ({ uiSettings: computed(() => env.uiSettings) }),
  };
});

const portals = [
  { slug: 'docs', meta: { default_locale: 'en' } },
  { slug: 'help', meta: { default_locale: 'fr' } },
];

const run = async ({ list = portals, uiSettings, navigationPath } = {}) => {
  env.store = {
    getters: { 'portals/allPortals': list },
    dispatch: vi.fn().mockResolvedValue(),
  };
  env.uiSettings = uiSettings;
  env.route = { params: { navigationPath } };
  env.replace = vi.fn();
  const wrapper = mount(PortalsIndexPage, {
    global: { stubs: { Spinner: true } },
  });
  await flushPromises();
  expect(env.store.dispatch).toHaveBeenCalledWith('portals/index');
  expect(wrapper.find('spinner-stub').exists()).toBe(true);
  return env.replace.mock.calls[0][0];
};

describe('PortalsIndexPage behaviour', () => {
  it('reopens the last active portal on a valid sub-page', async () => {
    expect(
      await run({
        uiSettings: {
          last_active_portal_slug: 'help',
          last_active_locale_code: 'de',
        },
        navigationPath: 'portals_settings_index',
      })
    ).toEqual({
      name: 'portals_settings_index',
      params: { portalSlug: 'help', locale: 'de' },
      replace: true,
    });
  });

  it('falls back to the first portal and the articles page', async () => {
    expect(
      await run({
        uiSettings: { last_active_portal_slug: 'gone' },
        navigationPath: 'bogus',
      })
    ).toEqual({
      name: 'portals_articles_index',
      params: { portalSlug: 'docs', locale: 'en' },
      replace: true,
    });
    expect(await run({ list: [{ slug: 'bare' }] })).toEqual({
      name: 'portals_articles_index',
      params: { portalSlug: 'bare', locale: undefined },
      replace: true,
    });
  });

  it('opens portal creation when there are no portals', async () => {
    expect(await run({ list: [], uiSettings: null })).toEqual({
      name: 'portals_new',
      params: {},
      replace: true,
    });
  });
});
