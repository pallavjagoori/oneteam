/**
 * OneTeam behaviour spec for the Captain tool picker in the reply box.
 *
 * Covers filtering tools by the search key, selecting the highlighted
 * tool or one by index, resetting the highlight when the list shrinks,
 * and hiding the dropdown when nothing matches.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import TagTools from '../TagTools.vue';

const env = vi.hoisted(() => ({ tools: null, onSelect: null }));

vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => env.tools,
}));
vi.mock('dashboard/composables/useKeyboardNavigableList', () => ({
  useKeyboardNavigableList: ({ onSelect }) => {
    env.onSelect = onSelect;
  },
}));

const ToolsDropdown = {
  name: 'ToolsDropdown',
  props: ['items', 'selectedIndex'],
  emits: ['select'],
  template: '<div class="tools" />',
};

/**
 * Mounts the picker with a search key.
 *
 * @param {string} searchKey Current search text.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountTools = searchKey => {
  env.tools = ref([{ title: 'Refund' }, { title: 'Reset password' }]);
  return mount(TagTools, {
    props: { searchKey },
    global: { stubs: { ToolsDropdown } },
  });
};

describe('TagTools behaviour', () => {
  it('filters tools and selects the highlighted one', () => {
    const wrapper = mountTools(' reset ');
    const dropdown = wrapper.getComponent(ToolsDropdown);
    expect(dropdown.props('items')).toEqual([{ title: 'Reset password' }]);
    expect(dropdown.props('selectedIndex')).toBe(0);
    dropdown.vm.$emit('select');
    expect(wrapper.emitted('selectTool')).toEqual([
      [{ title: 'Reset password' }],
    ]);
  });

  it('selects a tool by index and resets a stale highlight', async () => {
    const wrapper = mountTools('');
    wrapper.getComponent(ToolsDropdown).vm.$emit('select', 1);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('selectTool')).toEqual([
      [{ title: 'Reset password' }],
    ]);
    expect(wrapper.getComponent(ToolsDropdown).props('selectedIndex')).toBe(1);
    await wrapper.setProps({ searchKey: 'refund' });
    expect(wrapper.getComponent(ToolsDropdown).props('selectedIndex')).toBe(0);
    expect(env.onSelect).toBeTypeOf('function');
  });

  it('keeps the highlight while the list still has that tool', async () => {
    const wrapper = mountTools('');
    wrapper.getComponent(ToolsDropdown).vm.$emit('select', 1);
    await wrapper.setProps({ searchKey: 'e' });
    expect(wrapper.getComponent(ToolsDropdown).props('selectedIndex')).toBe(1);
    expect(wrapper.vm.$.setupState.adjustScroll()).toBeUndefined();
  });

  it('hides the dropdown when nothing matches', async () => {
    const wrapper = mountTools('nothing');
    expect(wrapper.findComponent(ToolsDropdown).exists()).toBe(false);
  });
});
