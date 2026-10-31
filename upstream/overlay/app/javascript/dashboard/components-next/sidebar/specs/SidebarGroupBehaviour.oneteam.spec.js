/**
 * OneTeam behaviour spec for a sidebar navigation group.
 *
 * The sidebar context, popover state and router are faked. Covers
 * hiding groups without accessible children, the expanded layout
 * (header, leaves, sub groups, empty leaf), picking the active child by
 * path, `activeOn` with params or by prefix, toggling and navigating,
 * auto-expanding, and the collapsed layout with its hover popover.
 */
import { reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import SidebarGroup from '../SidebarGroup.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('../provider', () => ({
  useSidebarContext: () => env.sidebar,
  usePopoverState: () => env.popover,
}));

const leaf = (name, path, extra = {}) => ({
  name,
  label: name,
  to: { name, path, params: {} },
  ...extra,
});

const mountGroup = async (props = {}) => {
  const wrapper = mount(SidebarGroup, {
    props: { name: 'inbox', label: 'Inbox', icon: 'i-inbox', ...props },
    attachTo: document.body,
    global: {
      stubs: {
        Policy: { template: '<li class="policy"><slot /></li>' },
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
        RouterLink: { props: ['to'], template: '<a class="link"><slot /></a>' },
        SidebarGroupHeader: {
          name: 'SidebarGroupHeader',
          props: [
            'to',
            'isActive',
            'hasActiveChild',
            'expandable',
            'isExpanded',
          ],
          emits: ['toggle'],
          template: '<div class="header" />',
        },
        SidebarGroupLeaf: {
          name: 'SidebarGroupLeaf',
          props: ['name', 'active'],
          template: '<div class="leaf" />',
        },
        SidebarSubGroup: {
          name: 'SidebarSubGroup',
          props: ['name', 'endTreeLine', 'activeChild', 'children'],
          emits: ['updateSort'],
          template: '<div class="sub" />',
        },
        SidebarGroupEmptyLeaf: { template: '<div class="empty" />' },
        SidebarCollapsedPopover: {
          name: 'SidebarCollapsedPopover',
          props: ['activeChild', 'triggerRect'],
          emits: ['close', 'mouseenter', 'mouseleave', 'sortToggle'],
          template: '<div class="popover" />',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const header = wrapper => wrapper.findComponent({ name: 'SidebarGroupHeader' });
const leaves = wrapper =>
  wrapper.findAllComponents({ name: 'SidebarGroupLeaf' });

describe('SidebarGroup behaviour', () => {
  beforeEach(() => {
    env.route = reactive({ path: '/other', name: 'other', params: {} });
    env.router = { push: vi.fn() };
    env.expanded = ref(null);
    env.allowed = () => true;
    env.sidebar = {
      expandedItem: env.expanded,
      setExpandedItem: vi.fn(name => {
        env.expanded.value = name;
      }),
      resolvePath: to => to.path,
      resolvePermissions: () => [],
      resolveFeatureFlag: () => '',
      isAllowed: to => env.allowed(to),
      isCollapsed: ref(false),
      isResizing: ref(false),
    };
    env.active = ref(null);
    env.popover = {
      activePopover: env.active,
      setActivePopover: vi.fn(name => {
        env.active.value = name;
      }),
      closeActivePopover: vi.fn(() => {
        env.active.value = null;
      }),
      scheduleClose: vi.fn(),
      cancelClose: vi.fn(),
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('navigates straight to a group without children', async () => {
    const wrapper = await mountGroup({ to: { path: '/home' } });
    expect(header(wrapper).props()).toMatchObject({
      to: { path: '/home' },
      isActive: false,
      expandable: false,
    });
    expect(wrapper.find('ul').exists()).toBe(false);
    header(wrapper).vm.$emit('toggle');
    expect(env.router.push).toHaveBeenCalledWith({ path: '/home' });
    expect(env.sidebar.setExpandedItem).toHaveBeenCalledWith('inbox');
  });

  it('is active on its own path or an activeOn route', async () => {
    env.route.path = '/home';
    let wrapper = await mountGroup({ to: { path: '/home' } });
    expect(header(wrapper).props('isActive')).toBe(true);
    env.route.path = '/x';
    env.route.name = 'home_extra';
    wrapper = await mountGroup({
      to: { path: '/home' },
      activeOn: ['home_extra'],
    });
    expect(header(wrapper).props('isActive')).toBe(true);
  });

  it('shows an empty leaf for an expanded group with an empty child list', async () => {
    env.expanded.value = 'inbox';
    const wrapper = await mountGroup({ children: [] });
    expect(wrapper.find('.empty').exists()).toBe(true);
    // Not expanded: nothing.
    env.expanded.value = null;
    await flushPromises();
    expect(wrapper.find('.empty').exists()).toBe(false);
  });

  it('hides the group when no child is accessible', async () => {
    env.allowed = () => false;
    const wrapper = await mountGroup({
      children: [
        leaf('a', '/a'),
        { name: 'g', children: [leaf('b', '/b')] },
        { name: 'nolink' },
      ],
    });
    expect(wrapper.find('.policy').exists()).toBe(false);
  });

  it('lists visible children and opens the first one on toggle', async () => {
    env.allowed = to => to.path !== '/hidden';
    const children = [
      leaf('a', '/a'),
      leaf('hidden', '/hidden'),
      {
        name: 'grp',
        label: 'Grp',
        showTreeLine: true,
        onSortChange: vi.fn(),
        children: [leaf('b', '/b')],
      },
      { name: 'grp2', children: [leaf('c', '/hidden')] },
    ];
    const wrapper = await mountGroup({ children });
    expect(leaves(wrapper).map(l => l.props('name'))).toEqual(['a']);
    const sub = wrapper.findComponent({ name: 'SidebarSubGroup' });
    expect(sub.props()).toMatchObject({ name: 'inbox:grp', endTreeLine: true });
    sub.vm.$emit('updateSort', 'name');
    expect(children[2].onSortChange).toHaveBeenCalledWith('name');
    expect(header(wrapper).props('to')).toEqual(children[0].to);
    header(wrapper).vm.$emit('toggle');
    expect(env.router.push).toHaveBeenCalledWith(children[0].to);
    await flushPromises();
    expect(header(wrapper).props('isExpanded')).toBe(true);
    // Toggling again while expanded does not navigate.
    header(wrapper).vm.$emit('toggle');
    expect(env.router.push).toHaveBeenCalledTimes(1);
  });

  it('expands and marks the child matching the current path', async () => {
    env.route.path = '/b';
    const wrapper = await mountGroup({
      children: [leaf('a', '/a'), leaf('b', '/b'), { name: 'x' }],
    });
    expect(env.sidebar.setExpandedItem).toHaveBeenCalledWith('inbox');
    expect(header(wrapper).props('hasActiveChild')).toBe(true);
    expect(leaves(wrapper).map(l => l.props('active'))).toEqual([false, true]);
    header(wrapper).vm.$emit('toggle');
    expect(env.router.push).not.toHaveBeenCalled();
  });

  it('ranks activeOn children by matching params', async () => {
    env.route.name = 'segment';
    env.route.params = { id: 2 };
    const children = [
      leaf('s1', '/s/1', {
        activeOn: ['segment'],
        to: { path: '/s/1', params: { id: 1 } },
      }),
      leaf('s2', '/s/2', {
        activeOn: ['segment'],
        to: { path: '/s/2', params: { id: '2' } },
      }),
    ];
    let wrapper = await mountGroup({ children });
    expect(leaves(wrapper).map(l => l.props('active'))).toEqual([false, true]);

    env.route.params = { id: 9 };
    wrapper = await mountGroup({ children });
    expect(leaves(wrapper).map(l => l.props('active'))).toEqual([true, false]);
  });

  it('matches a child by path prefix', async () => {
    env.route.path = '/a/42';
    const wrapper = await mountGroup({ children: [leaf('a', '/a')] });
    expect(leaves(wrapper)[0].props('active')).toBe(true);
  });

  it('expands later when a child becomes active', async () => {
    const wrapper = await mountGroup({ children: [leaf('a', '/a')] });
    expect(env.sidebar.setExpandedItem).not.toHaveBeenCalled();
    env.route.path = '/a';
    await flushPromises();
    expect(env.sidebar.setExpandedItem).toHaveBeenCalledWith('inbox');
    expect(wrapper.exists()).toBe(true);
  });

  it('does not re-expand when already expanded', async () => {
    env.expanded.value = 'inbox';
    await mountGroup({ children: [leaf('a', '/a')] });
    env.sidebar.setExpandedItem.mockClear();
    env.route.path = '/a';
    await flushPromises();
    // onMounted already ran; the watcher sees it expanded.
    expect(env.sidebar.setExpandedItem).not.toHaveBeenCalled();
  });

  describe('collapsed', () => {
    beforeEach(() => {
      env.sidebar.isCollapsed.value = true;
    });

    it('renders an icon link and opens a popover on hover', async () => {
      env.route.path = '/a';
      const wrapper = await mountGroup({ children: [leaf('a', '/a')] });
      expect(wrapper.find('a.link').exists()).toBe(true);
      expect(wrapper.find('.i-inbox').exists()).toBe(true);
      const trigger = wrapper.find('.relative');
      await trigger.trigger('mouseenter');
      expect(env.popover.cancelClose).toHaveBeenCalled();
      expect(env.popover.setActivePopover).toHaveBeenCalledWith('inbox');
      const popover = wrapper.findComponent({
        name: 'SidebarCollapsedPopover',
      });
      expect(popover.props('triggerRect')).toEqual({
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      });
      expect(popover.props('activeChild').name).toBe('a');

      popover.vm.$emit('mouseenter');
      popover.vm.$emit('mouseleave');
      expect(env.popover.scheduleClose).toHaveBeenCalledWith(100);
      await trigger.trigger('mouseleave');
      expect(env.popover.scheduleClose).toHaveBeenCalledWith(200);

      popover.vm.$emit('sortToggle', true);
      env.popover.scheduleClose.mockClear();
      popover.vm.$emit('mouseleave');
      await trigger.trigger('mouseleave');
      expect(env.popover.scheduleClose).not.toHaveBeenCalled();

      popover.vm.$emit('close');
      await flushPromises();
      expect(env.popover.closeActivePopover).toHaveBeenCalled();
      expect(
        wrapper.findComponent({ name: 'SidebarCollapsedPopover' }).exists()
      ).toBe(false);
    });

    it('ignores close requests for another group and closes on window blur', async () => {
      const wrapper = await mountGroup({ children: [leaf('a', '/a')] });
      env.active.value = 'other';
      await flushPromises();
      wrapper.vm.$.setupState.closePopover?.();
      expect(env.popover.closeActivePopover).not.toHaveBeenCalled();
      window.dispatchEvent(new Event('blur'));
      expect(env.popover.closeActivePopover).toHaveBeenCalledTimes(1);
      document.dispatchEvent(new Event('mouseleave'));
      expect(env.popover.closeActivePopover).toHaveBeenCalledTimes(2);
      wrapper.unmount();
      window.dispatchEvent(new Event('blur'));
      expect(env.popover.closeActivePopover).toHaveBeenCalledTimes(2);
    });

    it('does not open while resizing or without children', async () => {
      env.sidebar.isResizing.value = true;
      let wrapper = await mountGroup({ children: [leaf('a', '/a')] });
      await wrapper.find('.relative').trigger('mouseenter');
      expect(env.popover.setActivePopover).not.toHaveBeenCalled();

      env.sidebar.isResizing.value = false;
      wrapper = await mountGroup({ to: { path: '/home' }, icon: null });
      await wrapper.find('.relative').trigger('mouseenter');
      await wrapper.find('.relative').trigger('mouseleave');
      expect(env.popover.setActivePopover).not.toHaveBeenCalled();
      expect(env.popover.scheduleClose).not.toHaveBeenCalled();
      expect(wrapper.find('i').exists()).toBe(false);
    });

    it('renders a button when there is nowhere to link', async () => {
      const wrapper = await mountGroup({
        children: [{ name: 'g', children: [leaf('a', '/a')] }],
      });
      // Sub group items are reachable, so it links to the first one.
      expect(wrapper.find('a.link').exists()).toBe(true);
      const bare = await mountGroup();
      expect(bare.find('button').exists()).toBe(true);
    });
  });
});
