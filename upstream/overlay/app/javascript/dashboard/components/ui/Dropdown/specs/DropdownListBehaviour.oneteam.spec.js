/**
 * OneTeam behaviour spec for the filter dropdown list.
 *
 * Covers searching (local filtering plus a debounced search event),
 * clearing the filter, the loading and empty states, highlighting the
 * active filter, and selecting an item.
 */
import { mount } from '@vue/test-utils';
import DropdownList from '../DropdownList.vue';

const Search = {
  name: 'DropdownSearch',
  props: ['modelValue'],
  emits: ['update:modelValue', 'remove'],
  template: '<input />',
};
const Item = {
  name: 'ListItemButton',
  props: ['isActive', 'buttonText'],
  emits: ['click'],
  template:
    '<button @click="$emit(\'click\', $event)">{{ buttonText }}</button>',
};

const items = [
  { id: 1, name: 'Sales' },
  { id: 2, name: 'Support' },
];
const mountList = props =>
  mount(DropdownList, {
    props,
    global: {
      stubs: {
        DropdownSearch: Search,
        ListItemButton: Item,
        DropdownLoadingState: {
          props: ['message'],
          template: '<p class="loading">{{ message }}</p>',
        },
        DropdownEmptyState: {
          props: ['message'],
          template: '<p class="empty">{{ message }}</p>',
        },
      },
    },
  });

describe('DropdownList behaviour', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('searches, clears and selects', async () => {
    vi.useFakeTimers();
    const wrapper = mountList({
      listItems: items,
      enableSearch: true,
      activeFilterId: 2,
    });
    const buttons = wrapper.findAllComponents(Item);
    expect(buttons.map(button => button.props('isActive'))).toEqual([
      false,
      true,
    ]);
    const search = wrapper.findComponent(Search);
    await search.vm.$emit('update:modelValue', 'sal');
    expect(wrapper.findAllComponents(Item).map(b => b.text())).toEqual([
      'Sales',
    ]);
    vi.advanceTimersByTime(300);
    expect(wrapper.emitted('onSearch')).toEqual([['sal']]);
    await search.vm.$emit('remove');
    expect(wrapper.emitted('removeFilter')).toHaveLength(1);

    await wrapper.trigger('click');
    await wrapper.findComponent(Item).trigger('click');
    expect(wrapper.emitted('select')).toEqual([[items[0]]]);
  });

  it('shows loading and empty states', () => {
    expect(
      mountList({ isLoading: true, loadingPlaceholder: 'Loading' }).text()
    ).toContain('Loading');
    expect(mountList({ isLoading: true }).find('.loading').exists()).toBe(
      false
    );
    expect(mountList().find('.empty').exists()).toBe(true);
    const list = mountList({ listItems: items });
    expect(list.findAllComponents(Item)[0].props('isActive')).toBe(false);
    expect(list.findComponent(Search).exists()).toBe(false);
  });
});
