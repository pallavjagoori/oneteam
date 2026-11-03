/**
 * OneTeam behaviour spec for the shared details page layout.
 *
 * Covers the back button (with the RTL arrow), the loading spinner, a
 * state slot that replaces the content, the header, tabs and actions
 * slots, switching tabs, and scrolling the tab bar into view.
 */
import { mount } from '@vue/test-utils';
import { computed } from 'vue';
import DetailsPageLayout from '../DetailsPageLayout.vue';

const env = vi.hoisted(() => ({ rtl: false }));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => env.rtl),
}));

const Button = {
  name: 'NextButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template: '<button class="back" @click="$emit(\'click\')" />',
};
const TabBar = {
  name: 'TabBar',
  props: ['tabs', 'initialActiveTab'],
  emits: ['tabChanged'],
  template: '<div class="tabs" />',
};
const Spinner = { name: 'Spinner', template: '<i class="spinner" />' };

const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Members', value: 'members' },
];

/**
 * Mounts the layout with stubbed children.
 *
 * @param {object} props Layout props.
 * @param {object} slots Slots to render.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountLayout = (props = {}, slots = {}) =>
  mount(DetailsPageLayout, {
    props: { backLabel: 'Back', tabs, activeTab: 'members', ...props },
    slots,
    global: { stubs: { Button, TabBar, Spinner } },
  });

describe('DetailsPageLayout behaviour', () => {
  beforeEach(() => {
    env.rtl = false;
  });

  it('shows the content, tabs and actions, and switches tabs', async () => {
    const wrapper = mountLayout(
      {},
      {
        header: '<h1 class="head">Team</h1>',
        actions: '<button class="action" />',
        default: '<p class="body">Body</p>',
      }
    );
    expect(wrapper.get('.back').attributes()).toMatchObject({});
    expect(wrapper.getComponent(Button).props('icon')).toBe(
      'i-lucide-arrow-left'
    );
    expect(wrapper.find('.head').exists()).toBe(true);
    expect(wrapper.find('.action').exists()).toBe(true);
    expect(wrapper.find('.body').exists()).toBe(true);
    const bar = wrapper.getComponent(TabBar);
    expect(bar.props('initialActiveTab')).toBe(1);
    bar.vm.$emit('tabChanged', tabs[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:activeTab')).toEqual([['overview']]);
    await wrapper.get('.back').trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('points the back arrow the other way in RTL', () => {
    env.rtl = true;
    expect(mountLayout().getComponent(Button).props('icon')).toBe(
      'i-lucide-arrow-right'
    );
  });

  it('shows the spinner while loading and a state slot instead', () => {
    const loading = mountLayout({ isLoading: true }, { header: '<h1 />' });
    expect(loading.find('.spinner').exists()).toBe(true);
    expect(loading.find('.tabs').exists()).toBe(false);
    const empty = mountLayout({}, { state: '<p class="empty" />' });
    expect(empty.find('.empty').exists()).toBe(true);
    expect(empty.find('.tabs').exists()).toBe(false);
  });

  it('scrolls the tab bar into view', () => {
    const wrapper = mountLayout();
    const scrollIntoView = vi.fn();
    wrapper.vm.$refs.tabsRef.scrollIntoView = scrollIntoView;
    wrapper.vm.scrollToTabs();
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });
});
