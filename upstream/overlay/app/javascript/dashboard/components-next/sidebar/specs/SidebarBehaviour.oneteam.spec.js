/**
 * OneTeam behaviour spec for the main dashboard sidebar.
 *
 * Covers the data loaded on mount, unread counts (fetch, clear, no
 * account), sort preferences (loading, options per section, saving),
 * sorting folders, teams, inboxes and labels by unread count, the menu
 * children built from them (inbox leaf component, contact segments and
 * tagged labels), monitors availability, keyboard shortcut modal events,
 * closing the mobile flyout on outside clicks, collapsed vs expanded
 * header, changelog widgets, and drag/double-click resizing in LTR and RTL.
 */
import { computed, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { SIDEBAR_SORT_KEYS } from 'dashboard/helper/sidebarSort';
import Sidebar from '../Sidebar.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountScopedRoute: (name, params) => ({ name, params }),
    isOnChatwootCloud: env.cloud,
  }),
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ isEnterprise: env.isEnterprise }),
}));
vi.mock('dashboard/composables/utils/useKbd', () => ({
  useKbd: () => 'Ctrl K',
}));
vi.mock('vuex', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: key => computed(() => env.getters[key]),
}));
vi.mock('../useSidebarKeyboardShortcuts', () => ({
  useSidebarKeyboardShortcuts: fn => {
    env.toggleShortcuts = fn;
  },
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.clickOutside = binding.value;
    },
  },
}));
vi.mock('@vueuse/core', () => ({
  useWindowSize: () => ({ width: env.width }),
  useEventListener: (target, event, handler) => {
    env.listeners[event] = handler;
  },
}));
vi.mock('../provider', () => ({
  provideSidebarContext: ctx => {
    env.context = ctx;
  },
  useSidebarResize: () => env.resize,
}));

const SidebarGroup = {
  name: 'SidebarGroup',
  inheritAttrs: false,
  template: '<li class="group" />',
};
const stub = name => ({
  name,
  props: ['isCollapsed'],
  template: `<div class="${name}" />`,
});

const mountSidebar = (props = {}) =>
  mount(Sidebar, {
    props,
    global: {
      stubs: {
        SidebarGroup,
        SidebarAccountSwitcher: {
          name: 'SidebarAccountSwitcher',
          props: { isCollapsed: Boolean },
          emits: ['showCreateAccountModal'],
          template: '<div class="switcher" />',
        },
        SidebarProfileMenu: {
          name: 'SidebarProfileMenu',
          props: ['isCollapsed'],
          emits: ['openKeyShortcutModal'],
          template: '<div class="profile" />',
        },
        SidebarChangelogCard: stub('SidebarChangelogCard'),
        SidebarChangelogButton: stub('SidebarChangelogButton'),
        ComposeConversation: {
          template: '<div><slot name="trigger" :is-open="true" /></div>',
        },
        Logo: true,
        RouterLink: {
          props: ['to'],
          template: '<a class="search-link"><slot /></a>',
        },
      },
    },
  });

const groups = wrapper =>
  Object.fromEntries(
    wrapper
      .findAllComponents(SidebarGroup)
      .map(g => [g.vm.$attrs.name, g.vm.$attrs])
  );
const flatten = items =>
  items.flatMap(item => [item, ...flatten(item.children || [])]);
const menuItem = (wrapper, name) =>
  flatten(Object.values(groups(wrapper))).find(item => item.name === name);
const actions = () => env.dispatch.mock.calls.map(c => c[0]);

describe('Sidebar behaviour', () => {
  beforeEach(() => {
    env.cloud = ref(true);
    env.isEnterprise = false;
    env.width = ref(1200);
    env.listeners = {};
    env.dispatch = vi.fn();
    env.features = new Set([
      'reports',
      'conversation_monitors',
      'conversation_unread_counts',
      'unread_count_for_filters',
    ]);
    env.sort = SIDEBAR_SORT_KEYS.UNREAD_COUNT_DESC;
    const counts = { 1: 1, 2: 5 };
    env.getters = {
      'globalConfig/isACustomBrandedInstance': false,
      'accounts/isRTL': false,
      getCurrentAccountId: 1,
      getCurrentUserID: 9,
      'accounts/isFeatureEnabledonAccount': (_, flag) => env.features.has(flag),
      'inboxes/getInboxes': [
        { id: 1, name: 'A inbox', channel_type: 'Channel::Api' },
        { id: 2, name: 'B inbox', channel_type: 'Channel::Api' },
      ],
      'labels/getLabelsOnSidebar': [
        { id: 1, title: 'alpha', color: '#f00' },
        { id: 2, title: 'beta', color: '#0f0' },
      ],
      'conversationUnreadCounts/getAllUnreadCount': 6,
      'conversationUnreadCounts/getInboxUnreadCount': id => counts[id],
      'conversationUnreadCounts/getLabelUnreadCount': id => counts[id],
      'conversationUnreadCounts/getTeamUnreadCount': id => counts[id],
      'conversationUnreadCounts/getFolderUnreadCount': id => counts[id],
      'conversationUnreadCounts/getMentionsUnreadCount': 0,
      'conversationUnreadCounts/getParticipatingUnreadCount': 0,
      'conversationUnreadCounts/getUnattendedUnreadCount': 0,
      'teams/getMyTeams': [
        { id: 1, name: 'Sales' },
        { id: 2, name: 'Support' },
      ],
      'customViews/getContactCustomViews': [{ id: 3, name: 'VIPs' }],
      'customViews/getConversationCustomViews': [
        { id: 1, name: 'Mine' },
        { id: 2, name: 'Urgent' },
      ],
      'sidebarSortPreferences/getSectionSort': () => env.sort,
    };
    env.resize = {
      sidebarWidth: ref(200),
      isCollapsed: ref(false),
      setSidebarWidth: vi.fn(),
      saveWidth: vi.fn(),
      snapToCollapsed: vi.fn(),
      snapToExpanded: vi.fn(),
      COLLAPSED_THRESHOLD: 100,
    };
  });

  it('loads sidebar data, unread counts and sort preferences', () => {
    mountSidebar();
    expect(actions()).toEqual(
      expect.arrayContaining([
        'labels/get',
        'inboxes/get',
        'notifications/unReadCount',
        'teams/get',
        'attributes/get',
        'customViews/get',
        'conversationUnreadCounts/get',
        'sidebarSortPreferences/initialize',
      ])
    );
  });

  it('clears unread counts when the feature is off and skips without an account', async () => {
    env.features.delete('conversation_unread_counts');
    mountSidebar();
    expect(actions()).toContain('conversationUnreadCounts/clear');
    env.dispatch.mockClear();
    env.getters.getCurrentAccountId = null;
    mountSidebar();
    expect(actions()).not.toContain('conversationUnreadCounts/clear');
    expect(actions()).not.toContain('sidebarSortPreferences/initialize');
  });

  it('sorts sections by unread count and saves sort changes', () => {
    const wrapper = mountSidebar();
    const teams = menuItem(wrapper, 'Teams');
    expect(teams.children.map(c => c.label)).toEqual(['Support', 'Sales']);
    expect(teams.activeSort).toBe(SIDEBAR_SORT_KEYS.UNREAD_COUNT_DESC);
    expect(teams.sortOptions.length).toBeGreaterThan(0);
    teams.onSortChange(SIDEBAR_SORT_KEYS.ALPHABETICAL_ASC);
    expect(env.dispatch).toHaveBeenLastCalledWith(
      'sidebarSortPreferences/setSectionSort',
      {
        section: 'teams',
        sortBy: SIDEBAR_SORT_KEYS.ALPHABETICAL_ASC,
      }
    );
    const folders = menuItem(wrapper, 'Folders');
    expect(folders.children.map(c => c.label)).toEqual(['Urgent', 'Mine']);
    const channels = menuItem(wrapper, 'Channels');
    expect(channels.children.map(c => c.label)).toEqual(['B inbox', 'A inbox']);
    const leaf = channels.children[0].component({
      label: 'B inbox',
      active: true,
      badgeCount: 5,
    });
    expect(leaf.props).toMatchObject({
      label: 'B inbox',
      active: true,
      badgeCount: 5,
    });
    const labels = menuItem(wrapper, 'Labels');
    expect(labels.children.map(c => c.label)).toEqual(['beta', 'alpha']);
  });

  it('lists contact segments and tagged labels', () => {
    const wrapper = mountSidebar();
    expect(menuItem(wrapper, 'VIPs-3')).toBeDefined();
    const all = flatten(Object.values(groups(wrapper)));
    expect(all.filter(item => item.name === 'alpha-1')).toHaveLength(2);
  });

  it('builds the menu without filtered unread counts or monitors', () => {
    env.features.delete('unread_count_for_filters');
    env.features.delete('reports');
    env.cloud.value = false;
    const wrapper = mountSidebar();
    expect(Object.keys(groups(wrapper)).length).toBeGreaterThan(0);
  });

  it('opens and closes the keyboard shortcut modal', () => {
    const wrapper = mountSidebar();
    env.toggleShortcuts(true);
    env.toggleShortcuts(false);
    expect(wrapper.emitted('openKeyShortcutModal')).toHaveLength(1);
    expect(wrapper.emitted('closeKeyShortcutModal')).toHaveLength(1);
    wrapper
      .findComponent({ name: 'SidebarProfileMenu' })
      .vm.$emit('openKeyShortcutModal');
    wrapper
      .findComponent({ name: 'SidebarAccountSwitcher' })
      .vm.$emit('showCreateAccountModal');
    expect(wrapper.emitted('openKeyShortcutModal')).toHaveLength(2);
    expect(wrapper.emitted('showCreateAccountModal')).toHaveLength(1);
  });

  it('closes the mobile flyout on outside clicks only when open', () => {
    const closed = mountSidebar();
    env.clickOutside[0]();
    expect(closed.emitted('closeMobileSidebar')).toBeUndefined();
    const open = mountSidebar({ isMobileSidebarOpen: true });
    env.clickOutside[0]();
    expect(open.emitted('closeMobileSidebar')).toHaveLength(1);
  });

  it('shows the expanded header and changelog card', () => {
    const wrapper = mountSidebar();
    expect(wrapper.find('aside').attributes('style')).toContain('width: 200px');
    expect(wrapper.find('.SidebarChangelogCard').exists()).toBe(true);
    expect(wrapper.find('.SidebarChangelogButton').exists()).toBe(false);
    expect(wrapper.find('.search-link').text()).toContain('Ctrl K');
  });

  it('shows the collapsed header and changelog button', async () => {
    env.resize.isCollapsed.value = true;
    const wrapper = mountSidebar();
    expect(
      wrapper
        .findComponent({ name: 'SidebarAccountSwitcher' })
        .props('isCollapsed')
    ).toBe(true);
    expect(wrapper.find('.SidebarChangelogButton').exists()).toBe(true);
    expect(env.context.isCollapsed.value).toBe(true);
    wrapper
      .findComponent({ name: 'SidebarAccountSwitcher' })
      .vm.$emit('showCreateAccountModal');
    expect(wrapper.emitted('showCreateAccountModal')).toHaveLength(1);
    env.context.setExpandedItem('Inbox');
    expect(env.context.expandedItem.value).toBe('Inbox');
    env.context.setExpandedItem('Inbox');
    expect(env.context.expandedItem.value).toBeNull();
    env.width.value = 500;
    await nextTick();
    expect(env.context.isCollapsed.value).toBe(false);
    expect(wrapper.find('aside').attributes('style')).toBeUndefined();
  });

  it('resizes with the mouse and saves the width', async () => {
    const wrapper = mountSidebar();
    env.listeners.mousemove({ clientX: 50 });
    env.listeners.mouseup();
    expect(env.resize.setSidebarWidth).not.toHaveBeenCalled();
    const handle = wrapper.find('.cursor-col-resize');
    await handle.trigger('mousedown', { clientX: 100 });
    expect(env.context.isResizing.value).toBe(true);
    expect(document.body.style.cursor).toBe('col-resize');
    env.listeners.mousemove({ clientX: 140 });
    expect(env.resize.setSidebarWidth).toHaveBeenCalledWith(240);
    env.listeners.mouseup();
    expect(env.resize.saveWidth).toHaveBeenCalled();
    expect(document.body.style.cursor).toBe('');
  });

  it('resizes with touch in RTL and snaps to collapsed below the threshold', async () => {
    env.getters['accounts/isRTL'] = true;
    const wrapper = mountSidebar();
    await wrapper
      .find('.cursor-col-resize')
      .trigger('touchstart', { touches: [{ clientX: 100 }] });
    env.listeners.touchmove({ touches: [{ clientX: 60 }] });
    expect(env.resize.setSidebarWidth).toHaveBeenCalledWith(240);
    env.resize.sidebarWidth.value = 50;
    env.listeners.touchend();
    expect(env.resize.snapToCollapsed).toHaveBeenCalled();
  });

  it('toggles collapse with a double click', async () => {
    const wrapper = mountSidebar();
    await wrapper.find('.cursor-col-resize').trigger('dblclick');
    expect(env.resize.snapToCollapsed).toHaveBeenCalled();
    env.resize.isCollapsed.value = true;
    await wrapper.find('.cursor-col-resize').trigger('dblclick');
    expect(env.resize.snapToExpanded).toHaveBeenCalled();
  });
});
