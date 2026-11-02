/**
 * OneTeam behaviour spec for the collapsed sidebar's flyout menu.
 *
 * Covers placing the flyout beside the sidebar (left or right for RTL)
 * and keeping it inside the viewport, listing only links the user may
 * open, direct links and expandable sub-groups (auto-expanded for the
 * active link), custom link components, string and component icons,
 * sort menus, highlighting the active link, and closing on a link
 * click or a click outside.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { h, ref } from 'vue';
import SidebarCollapsedPopover from '../SidebarCollapsedPopover.vue';

const isRTL = ref(false);
let outside;
let outsideOptions;

vi.mock('../provider', () => ({
  useSidebarContext: () => ({
    isAllowed: to => !String(to).includes('denied'),
    sidebarWidth: ref(56),
  }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => isRTL,
}));
vi.mock('@vueuse/core', () => ({
  onClickOutside: (_, handler, options) => {
    outside = handler;
    outsideOptions = options;
  },
}));

const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  emits: ['click'],
  template: '<a :data-to="to" @click="$emit(\'click\')"><slot /></a>',
};
const SortMenu = {
  name: 'SidebarSortMenu',
  props: ['activeSort', 'options', 'openOnHover'],
  emits: ['sort', 'toggle'],
  template: '<div class="sort" />',
};
const Badge = {
  name: 'SidebarUnreadBadge',
  props: ['count'],
  template: '<b class="badge">{{ count }}</b>',
};
const ObjectIcon = { template: '<u class="object-icon" />' };
const Custom = props =>
  h('em', { class: 'custom' }, `${props.label}:${props.active}`);

const onSortChange = vi.fn();
const children = [
  {
    name: 'all',
    label: 'All',
    to: '/all',
    icon: 'i-lucide-inbox',
    badgeCount: 3,
  },
  { name: 'denied', label: 'Hidden', to: '/denied' },
  { name: 'nolink', label: 'No link' },
  { name: 'custom', label: 'Custom', to: '/custom', component: Custom },
  {
    name: 'teams',
    label: 'Teams',
    icon: 'i-lucide-users',
    sortOptions: [{ value: 'name' }],
    activeSort: 'name',
    onSortChange,
    children: [
      { name: 'sales', label: 'Sales', to: '/sales', icon: ObjectIcon },
      { name: 'denied-team', label: 'Nope', to: '/denied-team' },
      {
        name: 'vnode',
        label: 'VNode',
        to: '/vnode',
        component: h('i', { class: 'vnode' }),
      },
      { name: 'plain', label: 'Plain', to: '/plain' },
    ],
  },
  { name: 'bare', label: 'Bare', to: '/bare' },
  {
    name: 'folders',
    label: 'Folders',
    children: [{ name: 'f1', label: 'F1', to: '/f1' }],
  },
  {
    name: 'blocked',
    label: 'Blocked',
    children: [{ name: 'x', to: '/denied-x' }],
  },
];

const mountPopover = (props = {}) =>
  mount(SidebarCollapsedPopover, {
    props: { label: 'Conversations', children, ...props },
    global: {
      stubs: {
        TeleportWithDirection: { template: '<div><slot /></div>' },
        RouterLink,
        SidebarSortMenu: SortMenu,
        SidebarUnreadBadge: Badge,
        Icon: {
          props: ['icon'],
          template: '<i class="icon" :data-icon="icon" />',
        },
      },
    },
  });

const popover = wrapper => wrapper.find('.fixed');
const links = wrapper =>
  wrapper.findAllComponents(RouterLink).map(l => l.props('to'));

describe('SidebarCollapsedPopover behaviour', () => {
  beforeEach(() => {
    isRTL.value = false;
  });

  it('sits beside the sidebar and inside the viewport', async () => {
    const wrapper = mountPopover({ triggerRect: { top: 100 } });
    await flushPromises();
    expect(popover(wrapper).element.style.left).toBe('64px');
    expect(popover(wrapper).element.style.top).toBe('100px');

    const low = mountPopover({ triggerRect: { top: 600 } });
    await flushPromises();
    expect(popover(low).element.style.top).toBe(
      `${window.innerHeight - 300 - 20}px`
    );

    isRTL.value = true;
    const rtl = mountPopover({ triggerRect: null });
    await flushPromises();
    expect(popover(rtl).element.style.right).toBe('64px');
    expect(popover(rtl).element.style.top).toBe('0px');

    const defaults = mountPopover();
    await flushPromises();
    expect(popover(defaults).element.style.top).toBe('0px');
  });

  it('lists the allowed direct links and groups', () => {
    const wrapper = mountPopover();
    expect(wrapper.text()).toContain('Conversations');
    expect(links(wrapper)).toEqual(['/all', '/custom', '/bare']);
    expect(wrapper.text()).toContain('Teams');
    expect(wrapper.text()).not.toContain('Blocked');
    expect(wrapper.text()).not.toContain('Hidden');
    expect(wrapper.find('.icon[data-icon="i-lucide-inbox"]').exists()).toBe(
      true
    );
    expect(wrapper.find('.badge').text()).toBe('3');
    expect(wrapper.find('.custom').text()).toBe('Custom:false');
  });

  it('expands groups and passes sort changes on', async () => {
    const wrapper = mountPopover();
    const toggle = wrapper.findAll('li.group\\/sidebar-section button');
    await toggle[0].trigger('click');
    expect(links(wrapper)).toEqual([
      '/all',
      '/custom',
      '/sales',
      '/vnode',
      '/plain',
      '/bare',
    ]);
    expect(wrapper.find('.object-icon').exists()).toBe(true);
    expect(wrapper.find('.vnode').exists()).toBe(true);
    expect(wrapper.find('.rotate-180').exists()).toBe(true);
    await toggle[1].trigger('click');
    expect(links(wrapper)).toEqual(['/all', '/custom', '/bare']);

    const sort = wrapper.findComponent(SortMenu);
    expect(sort.props()).toEqual({
      activeSort: 'name',
      options: [{ value: 'name' }],
      openOnHover: false,
    });
    await sort.vm.$emit('sort', 'date');
    expect(onSortChange).toHaveBeenCalledWith('date');
    await sort.vm.$emit('toggle', true);
    expect(wrapper.emitted('sortToggle')).toEqual([[true]]);
  });

  it('highlights the active link and opens its group', async () => {
    const wrapper = mountPopover({ activeChild: { name: 'sales' } });
    await flushPromises();
    const sales = wrapper.find('a[data-to="/sales"]');
    expect(sales.classes()).toContain('bg-n-alpha-2');
    expect(wrapper.find('a[data-to="/plain"]').classes()).not.toContain(
      'text-n-slate-12'
    );

    const direct = mountPopover({ activeChild: { name: 'custom' } });
    await flushPromises();
    expect(direct.find('.custom').text()).toBe('Custom:true');
    expect(links(direct)).toEqual(['/all', '/custom', '/bare']);
  });

  it('closes on a link click, outside click and passes hover', async () => {
    const wrapper = mountPopover({ activeChild: { name: 'plain' } });
    await flushPromises();
    await wrapper.find('a[data-to="/all"]').trigger('click');
    await wrapper.find('a[data-to="/plain"]').trigger('click');
    outside();
    expect(wrapper.emitted('close')).toHaveLength(3);
    expect(outsideOptions).toEqual({ ignore: ['[data-popover-content]'] });

    await popover(wrapper).trigger('mouseenter');
    await popover(wrapper).trigger('mouseleave');
    expect(wrapper.emitted('mouseenter')).toHaveLength(1);
    expect(wrapper.emitted('mouseleave')).toHaveLength(1);
  });
});
