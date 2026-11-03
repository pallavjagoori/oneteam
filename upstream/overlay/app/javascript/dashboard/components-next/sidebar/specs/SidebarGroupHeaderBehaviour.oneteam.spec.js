/**
 * OneTeam behaviour spec for the sidebar group header.
 *
 * Covers the real link (and letting modified clicks through), the plain
 * header without a target, toggling, the unread badge and counts
 * (capped at 99+), the chevron for expandable groups, and the active
 * styling.
 */
import { mount } from '@vue/test-utils';
import { computed } from 'vue';
import SidebarGroupHeader from '../SidebarGroupHeader.vue';

const env = vi.hoisted(() => ({ getters: {} }));

vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: key => computed(() => env.getters[key]),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ resolve: to => ({ href: `/app/${to.name}` }) }),
}));

const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

/**
 * Mounts the header with the given getter values and props.
 *
 * @param {object} props Header props.
 * @param {object} getters Getter values by key.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountHeader = (props = {}, getters = {}) => {
  env.getters = getters;
  return mount(SidebarGroupHeader, {
    props: { label: 'Inbox', ...props },
    global: { stubs: { Icon } },
  });
};

describe('SidebarGroupHeader behaviour', () => {
  it('renders a link that toggles on plain clicks only', async () => {
    const wrapper = mountHeader({ to: { name: 'inbox' } });
    const link = wrapper.get('a');
    expect(link.attributes('href')).toBe('/app/inbox');
    await link.trigger('click', { metaKey: true });
    expect(wrapper.emitted('toggle')).toBeUndefined();
    await link.trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    expect(link.classes()).toContain('text-n-slate-11');
  });

  it('shows the badge and caps the count', () => {
    const wrapper = mountHeader(
      { icon: 'i-x', isActive: true, getterKeys: { badge: 'b', count: 'c' } },
      { b: true, c: 120 }
    );
    expect(wrapper.find('div > span.bg-n-brand').exists()).toBe(true);
    expect(wrapper.text()).toContain('99+');
    expect(wrapper.classes()).toContain('bg-n-alpha-2');
    expect(wrapper.element.tagName).toBe('DIV');
  });

  it('shows small counts as they are', () => {
    const wrapper = mountHeader(
      { getterKeys: { count: 'c' }, hasActiveChild: true },
      { c: 5 }
    );
    expect(wrapper.text()).toContain('5');
    expect(wrapper.classes()).toContain('font-medium');
  });

  it('toggles from the chevron of an expanded group', async () => {
    const wrapper = mountHeader(
      { expandable: true, isExpanded: true, getterKeys: { count: 'c' } },
      { c: 3 }
    );
    expect(wrapper.text()).not.toContain('3');
    await wrapper.get('.i-lucide-chevron-up').trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
  });

  it('lets every modifier click through', async () => {
    const wrapper = mountHeader({ to: { name: 'inbox' } });
    const link = wrapper.get('a');
    await link.trigger('click', { altKey: true });
    await link.trigger('click', { ctrlKey: true });
    await link.trigger('click', { shiftKey: true });
    expect(wrapper.emitted('toggle')).toBeUndefined();
  });

  it('styles an active group that also has an active child', () => {
    const wrapper = mountHeader({ isActive: true, hasActiveChild: true });
    expect(wrapper.classes()).not.toContain('bg-n-alpha-2');
    expect(wrapper.get('.truncate').classes()).toContain('text-sm');
  });

  it('shows the icon without a badge', () => {
    const wrapper = mountHeader({ icon: 'i-x' });
    expect(wrapper.findComponent(Icon).exists()).toBe(true);
    expect(wrapper.find('span.bg-n-brand').exists()).toBe(false);
  });
});
