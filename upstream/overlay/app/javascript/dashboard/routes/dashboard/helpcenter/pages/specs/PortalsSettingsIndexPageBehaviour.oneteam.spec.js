/**
 * OneTeam behaviour spec for the help center portal settings page.
 *
 * Covers saving portal settings (same slug, renamed slug with a route
 * refresh, errors), saving a custom domain and checking SSL later on
 * Chatwoot Cloud, refreshing SSL status, sending CNAME instructions, and
 * deleting a portal (moving to the next portal or to portal creation).
 */
import { computed, reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import Page from '../PortalsSettingsIndexPage.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ updateUISettings: env.updateUISettings }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isOnChatwootCloud: env.cloud }),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.state[name]),
}));

const Settings = {
  name: 'PortalSettings',
  props: ['portals', 'isFetching'],
  emits: [
    'updatePortal',
    'updatePortalConfiguration',
    'deletePortal',
    'refreshStatus',
    'sendCnameInstructions',
  ],
  template: '<div />',
};

const portals = [
  { slug: 'docs', meta: { default_locale: 'en' } },
  { slug: 'help', meta: { default_locale: 'fr' } },
];

const mountPage = async ({
  cloud = true,
  list = portals,
  slug = 'docs',
} = {}) => {
  env.route = { params: { portalSlug: slug } };
  env.router = { push: vi.fn(), replace: vi.fn().mockResolvedValue() };
  env.updateUISettings = vi.fn();
  env.cloud = ref(cloud);
  env.store = { dispatch: vi.fn().mockResolvedValue() };
  env.state = reactive({
    'portals/allPortals': list,
    'portals/isFetchingPortals': false,
    'portals/portalBySlug': s => list?.find(p => p.slug === s),
  });
  const wrapper = mount(Page, {
    global: { stubs: { PortalSettings: Settings } },
  });
  await flushPromises();
  return wrapper;
};

const settings = wrapper => wrapper.findComponent(Settings);
const emitAndFlush = async (wrapper, event, payload) => {
  settings(wrapper).vm.$emit(event, payload);
  await flushPromises();
};

describe('Portal settings page behaviour', () => {
  it('passes portals through and saves without a slug change', async () => {
    const wrapper = await mountPage();
    expect(settings(wrapper).props()).toEqual({ portals, isFetching: false });
    await emitAndFlush(wrapper, 'updatePortal', { name: 'Docs', slug: 'docs' });
    expect(env.store.dispatch).toHaveBeenCalledWith('portals/update', {
      name: 'Docs',
      slug: 'docs',
      portalSlug: 'docs',
    });
    expect(env.router.replace).not.toHaveBeenCalled();
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL_SETTINGS.API.UPDATE_PORTAL.SUCCESS_MESSAGE'
    );
    await emitAndFlush(wrapper, 'updatePortal', { name: 'No slug' });
    expect(env.router.replace).not.toHaveBeenCalled();
  });

  it('refreshes the route after renaming the slug', async () => {
    const wrapper = await mountPage();
    await emitAndFlush(wrapper, 'updatePortal', { slug: 'guides' });
    expect(env.store.dispatch).toHaveBeenCalledWith('portals/show', {
      portalSlug: 'guides',
      locale: 'en',
    });
    expect(env.store.dispatch).toHaveBeenCalledWith('categories/index', {
      portalSlug: 'guides',
      locale: 'en',
    });
    expect(env.updateUISettings).toHaveBeenCalledWith({
      last_active_portal_slug: 'guides',
      last_active_locale_code: 'en',
    });
    expect(env.router.replace).toHaveBeenCalledWith({
      name: 'portals_settings_index',
      params: { portalSlug: 'guides' },
    });
  });

  it('uses the new slug when the route has none and reports errors', async () => {
    const wrapper = await mountPage({ slug: '' });
    await emitAndFlush(wrapper, 'updatePortal', { slug: 'fresh' });
    expect(env.store.dispatch).toHaveBeenCalledWith('portals/update', {
      slug: 'fresh',
      portalSlug: 'fresh',
    });
    env.store.dispatch.mockRejectedValueOnce(new Error('Taken'));
    await emitAndFlush(wrapper, 'updatePortal', { slug: 'x' });
    expect(useAlert).toHaveBeenLastCalledWith('Taken');
    env.store.dispatch.mockRejectedValueOnce({});
    await emitAndFlush(wrapper, 'updatePortal', undefined);
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL_SETTINGS.API.UPDATE_PORTAL.ERROR_MESSAGE'
    );
  });

  it('checks SSL after saving a custom domain on Chatwoot Cloud', async () => {
    vi.useFakeTimers();
    const wrapper = await mountPage();
    settings(wrapper).vm.$emit('updatePortalConfiguration', {
      custom_domain: 'help.acme.test',
    });
    await vi.advanceTimersByTimeAsync(5000);
    expect(env.store.dispatch).toHaveBeenCalledWith('portals/sslStatus', {
      portalSlug: 'docs',
    });

    env.store.dispatch.mockClear();
    settings(wrapper).vm.$emit('updatePortalConfiguration', {
      custom_domain: 'help.acme.test',
    });
    env.cloud.value = false;
    await vi.advanceTimersByTimeAsync(5000);
    expect(env.store.dispatch).not.toHaveBeenCalledWith(
      'portals/sslStatus',
      expect.anything()
    );
    settings(wrapper).vm.$emit('updatePortalConfiguration', {
      custom_domain: 'other.test',
    });
    settings(wrapper).vm.$emit('updatePortalConfiguration', { name: 'x' });
    settings(wrapper).vm.$emit('updatePortalConfiguration', undefined);
    await vi.advanceTimersByTimeAsync(5000);
    expect(env.store.dispatch).not.toHaveBeenCalledWith(
      'portals/sslStatus',
      expect.anything()
    );
    vi.useRealTimers();
  });

  it('refreshes SSL status on request', async () => {
    const wrapper = await mountPage();
    await emitAndFlush(wrapper, 'refreshStatus');
    expect(env.store.dispatch).toHaveBeenCalledWith('portals/sslStatus', {
      portalSlug: 'docs',
    });
  });

  it('sends CNAME instructions', async () => {
    const wrapper = await mountPage();
    await emitAndFlush(wrapper, 'sendCnameInstructions', {
      email: 'it@acme.test',
    });
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'portals/sendCnameInstructions',
      { email: 'it@acme.test' }
    );
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL.PORTAL_SETTINGS.SEND_CNAME_INSTRUCTIONS.API.SUCCESS_MESSAGE'
    );
    env.store.dispatch.mockRejectedValueOnce(new Error('Bad email'));
    await emitAndFlush(wrapper, 'sendCnameInstructions', {});
    expect(useAlert).toHaveBeenLastCalledWith('Bad email');
    env.store.dispatch.mockRejectedValueOnce({});
    await emitAndFlush(wrapper, 'sendCnameInstructions', {});
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL.PORTAL_SETTINGS.SEND_CNAME_INSTRUCTIONS.API.ERROR_MESSAGE'
    );
  });

  it('deletes a portal and moves to the next one', async () => {
    const wrapper = await mountPage();
    await emitAndFlush(wrapper, 'deletePortal', { slug: 'docs' });
    expect(env.store.dispatch).toHaveBeenCalledWith('portals/delete', {
      portalSlug: 'docs',
    });
    expect(env.store.dispatch).toHaveBeenCalledWith('portals/show', {
      portalSlug: 'help',
      locale: 'fr',
    });
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'portals_articles_index',
      params: { portalSlug: 'help', locale: 'fr' },
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL.PORTAL_SETTINGS.DELETE_PORTAL.API.DELETE_SUCCESS'
    );
  });

  it('opens portal creation after deleting the last portal and reports errors', async () => {
    const wrapper = await mountPage({ list: [portals[0]] });
    await emitAndFlush(wrapper, 'deletePortal', { slug: 'docs' });
    expect(env.router.push).toHaveBeenCalledWith({ name: 'portals_new' });
    const none = await mountPage({ list: null });
    await emitAndFlush(none, 'deletePortal', { slug: 'docs' });
    expect(env.router.push).toHaveBeenCalledWith({ name: 'portals_new' });
    env.store.dispatch.mockRejectedValueOnce(new Error('Locked'));
    await emitAndFlush(none, 'deletePortal', { slug: 'docs' });
    expect(useAlert).toHaveBeenLastCalledWith('Locked');
    env.store.dispatch.mockRejectedValueOnce({});
    await emitAndFlush(none, 'deletePortal', { slug: 'docs' });
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PORTAL.PORTAL_SETTINGS.DELETE_PORTAL.API.DELETE_ERROR'
    );
  });
});
