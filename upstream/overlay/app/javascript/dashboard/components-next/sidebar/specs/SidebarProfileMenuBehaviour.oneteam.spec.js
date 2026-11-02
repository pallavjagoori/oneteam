/**
 * OneTeam behaviour spec for the sidebar's profile menu.
 *
 * Covers the trigger (avatar, name and email, or just the avatar with a
 * tooltip when collapsed, highlighted while open), the menu items
 * (support chat only with the feature and an inbox token, super admin
 * console only for super admins, items hidden on custom-branded
 * installs), and what each item does: open the support chat, open the
 * shortcuts modal, open the appearance palette, and log out.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import Auth from 'dashboard/api/auth';
import SidebarProfileMenu from '../SidebarProfileMenu.vue';

const currentUser = ref({});
const supportEnabled = ref(true);
const globalConfig = ref({ chatwootInboxToken: 'tok' });

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/api/auth', () => ({ default: { logout: vi.fn() } }));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name =>
    ({
      getCurrentUser: currentUser,
      getCurrentUserAvailability: ref('online'),
      getCurrentAccountId: ref(1),
      'globalConfig/get': globalConfig,
      'accounts/isFeatureEnabledonAccount': ref(
        (id, flag) =>
          id === 1 &&
          flag === 'contact_chatwoot_support_team' &&
          supportEnabled.value
      ),
    })[name],
}));
vi.mock('next/dropdown-menu/base', () => ({
  DropdownContainer: {
    name: 'DropdownContainer',
    emits: ['close'],
    data: () => ({ isOpen: false }),
    template:
      '<div class="container"><slot name="trigger" :is-open="isOpen" :toggle="() => (isOpen = !isOpen)" /><slot /></div>',
  },
  DropdownBody: { template: '<div class="body"><slot /></div>' },
  DropdownSeparator: { template: '<hr />' },
  DropdownItem: {
    name: 'DropdownItem',
    props: ['label', 'icon', 'click', 'link', 'nativeLink', 'target'],
    template: '<div class="item">{{ label }}</div>',
  },
}));

const mountMenu = (props = {}) =>
  mount(SidebarProfileMenu, {
    props,
    global: {
      stubs: {
        Avatar: {
          props: ['name', 'src', 'status'],
          template: '<i class="avatar" />',
        },
        SidebarProfileMenuStatus: true,
        CustomBrandPolicyWrapper: {
          props: ['showOnCustomBrandedInstance'],
          template:
            '<div :data-branded="showOnCustomBrandedInstance"><slot /></div>',
        },
      },
    },
  });

const items = wrapper => wrapper.findAllComponents({ name: 'DropdownItem' });
const item = (wrapper, label) =>
  items(wrapper).find(i => i.props('label') === `SIDEBAR_ITEMS.${label}`);

describe('SidebarProfileMenu behaviour', () => {
  beforeEach(() => {
    currentUser.value = {
      available_name: 'Ann',
      email: 'ann@x.co',
      avatar_url: 'a.png',
      type: 'User',
    };
    supportEnabled.value = true;
    globalConfig.value = { chatwootInboxToken: 'tok' };
    vi.clearAllMocks();
  });

  it('shows the user and opens the menu', async () => {
    const wrapper = mountMenu();
    const button = wrapper.find('button');
    expect(button.text()).toContain('Ann');
    expect(button.text()).toContain('ann@x.co');
    expect(button.attributes('title')).toBeUndefined();
    expect(wrapper.find('.container').classes()).toContain('w-full');
    await button.trigger('click');
    expect(button.classes()).toContain('bg-n-alpha-1');
    await wrapper
      .findComponent({ name: 'DropdownContainer' })
      .vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);

    const collapsed = mountMenu({ isCollapsed: true });
    expect(collapsed.find('button').attributes('title')).toBe('Ann');
    expect(collapsed.find('button').text()).toBe('');
    expect(collapsed.find('.container').classes()).toContain('w-auto');
  });

  it('lists the menu items for the user and install', () => {
    const labels = wrapper => items(wrapper).map(i => i.props('label'));
    expect(labels(mountMenu())).toEqual([
      'SIDEBAR_ITEMS.CONTACT_SUPPORT',
      'SIDEBAR_ITEMS.KEYBOARD_SHORTCUTS',
      'SIDEBAR_ITEMS.PROFILE_SETTINGS',
      'SIDEBAR_ITEMS.APPEARANCE',
      'SIDEBAR_ITEMS.DOCS',
      'SIDEBAR_ITEMS.CHANGELOG',
      'SIDEBAR_ITEMS.LOGOUT',
    ]);
    const branded = mountMenu().findAll('[data-branded]');
    expect(branded.map(b => b.attributes('data-branded'))).toEqual([
      'false',
      'true',
      'true',
      'true',
      'false',
      'false',
      'true',
    ]);

    supportEnabled.value = false;
    expect(labels(mountMenu())).not.toContain('SIDEBAR_ITEMS.CONTACT_SUPPORT');
    supportEnabled.value = true;
    globalConfig.value = {};
    expect(labels(mountMenu())).not.toContain('SIDEBAR_ITEMS.CONTACT_SUPPORT');

    currentUser.value = { ...currentUser.value, type: 'SuperAdmin' };
    const admin = item(mountMenu(), 'SUPER_ADMIN_CONSOLE');
    expect(admin.props()).toEqual(
      expect.objectContaining({ link: '/super_admin', target: '_blank' })
    );
  });

  it('runs each menu action', () => {
    const wrapper = mountMenu();
    const toggle = vi.fn();
    window.$chatwoot = { toggle };
    item(wrapper, 'CONTACT_SUPPORT').props('click')();
    expect(toggle).toHaveBeenCalled();
    delete window.$chatwoot;
    expect(() =>
      item(wrapper, 'CONTACT_SUPPORT').props('click')()
    ).not.toThrow();

    item(wrapper, 'KEYBOARD_SHORTCUTS').props('click')();
    expect(wrapper.emitted('openKeyShortcutModal')).toHaveLength(1);

    const ninja = document.createElement('ninja-keys');
    ninja.open = vi.fn();
    document.body.appendChild(ninja);
    item(wrapper, 'APPEARANCE').props('click')();
    expect(ninja.open).toHaveBeenCalledWith({ parent: 'appearance_settings' });
    ninja.remove();

    expect(item(wrapper, 'PROFILE_SETTINGS').props('link')).toEqual({
      name: 'profile_settings_index',
    });
    item(wrapper, 'LOGOUT').props('click')();
    expect(Auth.logout).toHaveBeenCalled();
  });
});
