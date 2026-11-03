/**
 * OneTeam behaviour spec for the search result tabs.
 *
 * Covers mapping tabs to tab bar entries (badges only when asked),
 * emitting the key of the chosen tab, and following the selected tab
 * prop.
 */
import { mount } from '@vue/test-utils';
import SearchTabs from '../SearchTabs.vue';

const TabBar = {
  name: 'TabBar',
  props: ['tabs', 'initialActiveTab'],
  emits: ['tabChanged'],
  template: '<div />',
};
const tabs = [
  { key: 'all', name: 'All', count: 9, showBadge: false },
  { key: 'contacts', name: 'Contacts', count: 3, showBadge: true },
];

/**
 * Mounts the tabs with a stubbed tab bar.
 *
 * @param {object} props Component props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountTabs = props =>
  mount(SearchTabs, { props, global: { stubs: { TabBar } } });

describe('SearchTabs behaviour', () => {
  it('maps tabs and emits the chosen key', async () => {
    const wrapper = mountTabs({ tabs });
    const bar = wrapper.getComponent(TabBar);
    expect(bar.props('tabs')).toEqual([
      { label: 'All', count: null },
      { label: 'Contacts', count: 3 },
    ]);
    bar.vm.$emit('tabChanged', { label: 'Contacts' });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('tabChange')).toEqual([['contacts']]);
    expect(bar.props('initialActiveTab')).toBe(1);
  });

  it('follows the selected tab prop', async () => {
    const wrapper = mountTabs({ tabs, selectedTab: 0 });
    await wrapper.setProps({ selectedTab: 1 });
    expect(wrapper.getComponent(TabBar).props('initialActiveTab')).toBe(1);
  });

  it('defaults to no tabs', () => {
    expect(mountTabs({}).getComponent(TabBar).props('tabs')).toEqual([]);
  });
});
