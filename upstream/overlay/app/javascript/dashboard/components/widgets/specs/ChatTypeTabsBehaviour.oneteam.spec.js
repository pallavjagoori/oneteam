/**
 * OneTeam behaviour spec for the conversation ChatTypeTabs.
 *
 * Covers tab change events and the Alt+N shortcut that cycles tabs.
 */
import { mount } from '@vue/test-utils';
import ChatTypeTabs from '../ChatTypeTabs.vue';

const captured = vi.hoisted(() => ({ events: null }));

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => {
    captured.events = events;
  },
}));

const items = [
  { key: 'me', name: 'Mine', count: 1 },
  { key: 'unassigned', name: 'Unassigned', count: 2 },
  { key: 'all', name: 'All', count: 3 },
];

/**
 * Mounts ChatTypeTabs with tab stubs.
 *
 * @param {string} activeTab active tab key
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountTabs = activeTab =>
  mount(ChatTypeTabs, {
    props: { items, activeTab },
    global: {
      stubs: {
        WootTabs: {
          props: { index: Number },
          emits: ['change'],
          template: '<div :data-index="index"><slot /></div>',
        },
        WootTabsItem: { template: '<span />' },
      },
    },
  });

describe('ChatTypeTabs behaviour', () => {
  it('passes the active tab index', () => {
    expect(
      mountTabs('unassigned').find('[data-index]').attributes('data-index')
    ).toBe('1');
  });

  it('emits a change only for a different, valid tab', () => {
    const wrapper = mountTabs('me');
    const { onTabChange } = wrapper.vm.$.setupState;
    onTabChange(0);
    onTabChange(-1);
    onTabChange(5);
    onTabChange(2);
    expect(wrapper.emitted('chatTabChange')).toEqual([['all']]);
  });

  it('cycles to the next tab with Alt+N', () => {
    const wrapper = mountTabs('me');
    captured.events['Alt+KeyN'].action();
    expect(wrapper.emitted('chatTabChange')).toEqual([['unassigned']]);
  });

  it('jumps back to the first tab from the all tab', () => {
    const wrapper = mountTabs('all');
    captured.events['Alt+KeyN'].action();
    expect(wrapper.emitted('chatTabChange')).toEqual([['me']]);
  });
});
