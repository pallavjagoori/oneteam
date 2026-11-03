/**
 * OneTeam behaviour spec for the sidebar SidebarSubGroup.
 *
 * Covers invalid stored minimized sections, the scroll hint for long
 * lists, expanding a minimized group with an active child, storage
 * events, and toggling a non collapsible group.
 */
import { mount } from '@vue/test-utils';
import SidebarSubGroup from '../SidebarSubGroup.vue';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';

const KEY = LOCAL_STORAGE_KEYS.SIDEBAR_MINIMIZED_SECTIONS;
const env = vi.hoisted(() => ({ accountId: 1, listeners: {} }));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useEventListener: (target, event, listener) => {
    env.listeners[event] = listener;
  },
}));

vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: () => computed(() => env.accountId) };
});
vi.mock('../provider', () => ({
  useSidebarContext: () => ({ isAllowed: () => true }),
}));

const SeparatorStub = {
  name: 'SidebarGroupSeparator',
  props: ['isExpanded'],
  emits: ['toggle', 'updateSort'],
  template: '<div class="separator" />',
};

/**
 * Builds sidebar children.
 *
 * @param {number} count number of children
 * @returns {Array<object>}
 */
const makeChildren = count =>
  Array.from({ length: count }, (_, i) => ({
    name: `c${i}`,
    label: `C${i}`,
    to: { name: 'x' },
  }));

/**
 * Mounts the sub group.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountGroup = props =>
  mount(SidebarSubGroup, {
    props: {
      name: 'Teams',
      label: 'Teams',
      icon: 'i-lucide-users',
      isExpanded: true,
      children: makeChildren(2),
      ...props,
    },
    global: {
      stubs: {
        SidebarGroupSeparator: SeparatorStub,
        SidebarGroupLeaf: { template: '<li class="leaf" />' },
        Icon: { template: '<i class="chevron" />' },
      },
    },
  });

describe('SidebarSubGroup behaviour', () => {
  beforeEach(() => {
    localStorage.clear();
    env.accountId = 1;
  });

  it('treats an invalid stored value as no minimized sections', () => {
    localStorage.setItem(KEY, JSON.stringify(['bad']));
    const wrapper = mountGroup({ collapsible: true });
    expect(wrapper.findComponent(SeparatorStub).props('isExpanded')).toBe(true);
  });

  it('shows the scroll hint for more than seven items', () => {
    const wrapper = mountGroup({ children: makeChildren(8) });
    expect(wrapper.find('.chevron').exists()).toBe(true);
    expect(wrapper.find('.max-h-60').exists()).toBe(true);
  });

  it('expands a minimized group that has the active child', () => {
    localStorage.setItem(KEY, JSON.stringify({ '1:Teams': true }));
    const wrapper = mountGroup({
      collapsible: true,
      activeChild: { name: 'c1' },
    });
    expect(wrapper.findComponent(SeparatorStub).props('isExpanded')).toBe(true);
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({});
  });

  it('keys by name without an account and reacts to storage events', async () => {
    env.accountId = null;
    const wrapper = mountGroup({ collapsible: true });
    localStorage.setItem(KEY, JSON.stringify({ Teams: true }));
    env.listeners.storage({ key: 'other' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(SeparatorStub).props('isExpanded')).toBe(true);
    env.listeners.storage({ key: KEY });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(SeparatorStub).props('isExpanded')).toBe(
      false
    );
    wrapper.unmount();
  });

  it('ignores toggles on a non collapsible group', async () => {
    const wrapper = mountGroup({});
    wrapper.findComponent(SeparatorStub).vm.$emit('toggle');
    await wrapper.vm.$nextTick();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
  it('minimizes and expands a collapsible group and forwards sorting', async () => {
    const wrapper = mountGroup({ collapsible: true });
    const separator = wrapper.findComponent(SeparatorStub);
    separator.vm.$emit('toggle');
    await wrapper.vm.$nextTick();
    expect(separator.props('isExpanded')).toBe(false);
    separator.vm.$emit('toggle');
    await wrapper.vm.$nextTick();
    expect(separator.props('isExpanded')).toBe(true);
    separator.vm.$emit('updateSort', 'name');
    expect(wrapper.emitted('update-sort')).toEqual([['name']]);
  });

  it('hides the scroll hint at the end of the list', async () => {
    const wrapper = mountGroup({ children: makeChildren(8) });
    const container = wrapper.find('.max-h-60');
    Object.defineProperties(container.element, {
      scrollHeight: { value: 300 },
      scrollTop: { value: 60 },
      clientHeight: { value: 240 },
    });
    env.listeners.scroll();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.chevron').element.parentElement.style.display).toBe(
      'none'
    );
  });

  it('shows only the active child while the sidebar is collapsed', () => {
    const wrapper = mountGroup({
      isExpanded: false,
      activeChild: { name: 'c1' },
    });
    const leaves = wrapper.findAll('.leaf');
    expect(leaves[0].element.style.display).toBe('none');
    expect(leaves[1].element.style.display).toBe('');
  });

  it('renders nothing without accessible children', () => {
    const wrapper = mountGroup({ children: [{ name: 'a', label: 'A' }] });
    expect(wrapper.find('.separator').exists()).toBe(false);
  });
});
