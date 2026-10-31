/**
 * OneTeam behaviour spec for the company detail page header.
 *
 * Covers the name (or unnamed fallback), open conversation badge,
 * domain, phone and social links, the long description toggle, avatar
 * upload and delete (with busy states and alerts), refreshing company
 * data (paywall, success, plan error, server and fallback errors), the
 * upgrade dialog's billing link, the admin-only delete menu and edit.
 */
import { reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CompanyDetailHeader from '../CompanyDetailHeader.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
  }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => env.globalConfig,
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ accountId: ref(4) }),
}));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: env.isAdmin }),
}));
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ shouldShowPaywall: flag => env.paywall(flag) }),
}));
vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: ts => `time-${ts}`,
}));
vi.mock('dashboard/stores/companies', () => ({
  useCompaniesStore: () => env.store,
}));

const Avatar = {
  name: 'Avatar',
  props: ['name', 'src', 'allowUpload'],
  emits: ['upload', 'delete'],
  template: '<div />',
};
const NextButton = {
  name: 'Button',
  props: ['icon', 'isLoading'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};
const Dialog = {
  name: 'Dialog',
  emits: ['confirm'],
  methods: { open: () => env.dialog.open(), close: () => env.dialog.close() },
  template: '<div />',
};
const Menu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul />',
};
const Social = {
  name: 'SocialProfileLinks',
  props: ['profiles'],
  template: '<div />',
};

const company = (extra = {}) => ({
  id: 8,
  name: 'Acme',
  domain: 'acme.test',
  description: 'Short',
  avatarUrl: 'acme.png',
  additionalAttributes: {
    phone: '+1 555',
    social_profiles: { linkedin: 'acme' },
    enriched_at: '2024-01-01T00:00:00Z',
  },
  ...extra,
});

const mountHeader = async (
  props = {},
  { admin = true, enrichment = true } = {}
) => {
  env.router = { push: vi.fn() };
  env.isAdmin = ref(admin);
  env.globalConfig = ref({ isCompanyEnrichmentEnabled: enrichment });
  env.paywall = vi.fn(() => false);
  env.dialog = { open: vi.fn(), close: vi.fn() };
  env.store = reactive({
    getUIFlags: {
      deletingAvatar: false,
      updatingItem: false,
      enrichingItem: false,
    },
    enrich: vi.fn().mockResolvedValue(),
    update: vi.fn().mockResolvedValue(),
    deleteCompanyAvatar: vi.fn().mockResolvedValue(),
  });
  const wrapper = mount(CompanyDetailHeader, {
    props: { company: company(), ...props },
    global: {
      stubs: {
        Avatar,
        Button: NextButton,
        Dialog,
        DropdownMenu: Menu,
        SocialProfileLinks: Social,
      },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const button = (wrapper, icon) => wrapper.find(`[data-icon="${icon}"]`);

describe('Company detail header behaviour', () => {
  it('shows the company details and links', async () => {
    const wrapper = await mountHeader({ openConversationsCount: 3 });
    expect(wrapper.find('h1').text()).toBe('Acme');
    expect(wrapper.findComponent(Avatar).props()).toMatchObject({
      name: 'Acme',
      src: 'acme.png',
      allowUpload: true,
    });
    expect(wrapper.find('a[href="https://acme.test"]').exists()).toBe(true);
    expect(wrapper.find('a[href="tel:+1 555"]').exists()).toBe(true);
    expect(wrapper.find('.bg-n-weak').exists()).toBe(true);
    expect(wrapper.findComponent(Social).props('profiles')).toEqual({
      linkedin: 'acme',
    });
    await wrapper.find('button.bg-n-amber-3').trigger('click');
    expect(wrapper.emitted('showOpenConversations')).toHaveLength(1);
    await button(wrapper, 'i-lucide-pencil').trigger('click');
    expect(wrapper.emitted('edit')).toHaveLength(1);
  });

  it('falls back for a bare company', async () => {
    const wrapper = await mountHeader(
      {
        company: {
          id: 9,
          name: '',
          domain: '',
          additionalAttributes: { social_profiles: { x: 'y' } },
        },
      },
      { admin: false }
    );
    expect(wrapper.find('h1').text()).toBe('COMPANIES.UNNAMED');
    expect(wrapper.findComponent(Avatar).props('src')).toBe('');
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.find('.bg-n-weak').exists()).toBe(false);
    expect(wrapper.find('button.bg-n-amber-3').exists()).toBe(false);
    expect(button(wrapper, 'i-lucide-refresh-cw').exists()).toBe(false);
    expect(button(wrapper, 'i-lucide-ellipsis').exists()).toBe(false);
    const none = await mountHeader({ company: { id: 10 } });
    expect(none.findComponent(Social).props('profiles')).toEqual({});
    expect(button(none, 'i-lucide-refresh-cw').exists()).toBe(false);
    const disabled = await mountHeader({}, { enrichment: false });
    expect(button(disabled, 'i-lucide-refresh-cw').exists()).toBe(false);
  });

  it('expands long descriptions and resets on company change', async () => {
    const wrapper = await mountHeader({
      company: company({ description: 'x'.repeat(201) }),
    });
    const toggle = () => wrapper.find('p + button');
    expect(toggle().text()).toBe('COMPANIES.DETAIL.HEADER.MORE');
    await toggle().trigger('click');
    expect(toggle().text()).toBe('COMPANIES.DETAIL.HEADER.LESS');
    expect(wrapper.find('p').classes()).not.toContain('line-clamp-2');
    await wrapper.setProps({
      company: company({ id: 99, description: 'x'.repeat(201) }),
    });
    expect(toggle().text()).toBe('COMPANIES.DETAIL.HEADER.MORE');
    await wrapper.setProps({ company: company({ description: '' }) });
    expect(wrapper.find('p.line-clamp-2').exists()).toBe(false);
  });

  it('uploads and deletes the avatar', async () => {
    const wrapper = await mountHeader();
    let finish;
    env.store.update.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    wrapper
      .findComponent(Avatar)
      .vm.$emit('upload', { file: 'f', url: 'blob:1' });
    await flushPromises();
    expect(wrapper.findComponent(Avatar).props()).toMatchObject({
      src: 'blob:1',
      allowUpload: false,
    });
    expect(wrapper.text()).toContain('COMPANIES.DETAIL.AVATAR.UPDATING');
    finish();
    await flushPromises();
    expect(env.store.update).toHaveBeenCalledWith({ id: 8, avatar: 'f' });
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.AVATAR.UPLOAD_SUCCESS'
    );

    env.store.update.mockRejectedValueOnce(new Error('x'));
    wrapper
      .findComponent(Avatar)
      .vm.$emit('upload', { file: 'g', url: 'blob:2' });
    await flushPromises();
    expect(wrapper.findComponent(Avatar).props('src')).toBe('acme.png');
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.AVATAR.UPLOAD_ERROR'
    );

    wrapper.findComponent(Avatar).vm.$emit('delete');
    await flushPromises();
    expect(env.store.deleteCompanyAvatar).toHaveBeenCalledWith(8);
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.AVATAR.DELETE_SUCCESS'
    );
    env.store.deleteCompanyAvatar.mockRejectedValueOnce(new Error('x'));
    wrapper.findComponent(Avatar).vm.$emit('delete');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.AVATAR.DELETE_ERROR'
    );

    env.store.getUIFlags = { deletingAvatar: true, updatingItem: false };
    await flushPromises();
    expect(wrapper.text()).toContain('COMPANIES.DETAIL.AVATAR.UPDATING');
    env.store.getUIFlags = { deletingAvatar: false, updatingItem: true };
    await flushPromises();
    expect(wrapper.findComponent(Avatar).props('allowUpload')).toBe(false);
  });

  it('refreshes company data and handles plan limits', async () => {
    const wrapper = await mountHeader();
    const refresh = () =>
      button(wrapper, 'i-lucide-refresh-cw').trigger('click');
    await refresh();
    await flushPromises();
    expect(env.store.enrich).toHaveBeenCalledWith(8);
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.PROFILE.MESSAGES.REFRESH_SUCCESS'
    );

    env.store.enrich.mockRejectedValueOnce({ response: { status: 403 } });
    await refresh();
    await flushPromises();
    expect(env.dialog.open).toHaveBeenCalledTimes(1);
    env.store.enrich.mockRejectedValueOnce({
      response: { status: 422, data: { error: 'No domain' } },
    });
    await refresh();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('No domain');
    env.store.enrich.mockRejectedValueOnce({});
    await refresh();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.PROFILE.MESSAGES.REFRESH_ERROR'
    );

    env.paywall.mockReturnValue(true);
    await refresh();
    expect(env.paywall).toHaveBeenCalledWith('company_enrichment');
    expect(env.dialog.open).toHaveBeenCalledTimes(2);
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    expect(env.dialog.close).toHaveBeenCalled();
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 4 },
    });
  });

  it('offers refresh for never-enriched companies', async () => {
    const wrapper = await mountHeader({
      company: company({ additionalAttributes: {} }),
    });
    expect(button(wrapper, 'i-lucide-refresh-cw').exists()).toBe(true);
  });

  it('opens the admin menu and emits delete', async () => {
    const wrapper = await mountHeader();
    await button(wrapper, 'i-lucide-ellipsis').trigger('click');
    expect(wrapper.findComponent(Menu).props('menuItems')[0].action).toBe(
      'delete'
    );
    env.clickaway();
    await flushPromises();
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
    await button(wrapper, 'i-lucide-ellipsis').trigger('click');
    await wrapper.findComponent(Menu).vm.$emit('action', { action: 'delete' });
    expect(wrapper.emitted('delete')).toHaveLength(1);
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
  });
});
