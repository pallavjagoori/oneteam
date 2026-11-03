/**
 * OneTeam behaviour spec for an applied filter chip on report pages.
 *
 * Covers toggling the chip's menu, showing the option list only for the
 * active filter, passing list settings, choosing and clearing a filter,
 * and closing on a click outside.
 */
import { mount } from '@vue/test-utils';
import ActiveFilterChip from '../ActiveFilterChip.vue';

const stubs = vi.hoisted(() => ({
  button: {
    name: 'FilterButton',
    props: ['buttonText'],
    emits: ['click'],
    template:
      '<div><button class="chip" @click="$emit(\'click\')">{{ buttonText }}</button><slot name="dropdown" /></div>',
  },
  list: {
    name: 'FilterListDropdown',
    props: {
      showClearFilter: Boolean,
      listItems: Array,
      activeFilterId: Number,
      inputPlaceholder: String,
      enableSearch: Boolean,
    },
    emits: ['select', 'removeFilter'],
    template: '<ul />',
  },
}));

vi.mock('dashboard/components/ui/Dropdown/DropdownButton.vue', () => ({
  default: stubs.button,
}));
vi.mock('dashboard/components/ui/Dropdown/DropdownList.vue', () => ({
  default: stubs.list,
}));

let clickaway;

/**
 * Mounts the chip.
 *
 * @param {object} props Chip props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountChip = props =>
  mount(ActiveFilterChip, {
    props: { name: 'Agent: Jane', type: 'agent', ...props },
    global: {
      directives: {
        'on-clickaway': {
          mounted: (el, { value }) => {
            clickaway = value;
          },
        },
      },
    },
  });

describe('ActiveFilterChip behaviour', () => {
  it('toggles the menu and hides options for other filters', async () => {
    const wrapper = mountChip({ showMenu: true, activeFilterType: 'team' });
    expect(wrapper.get('.chip').text()).toBe('Agent: Jane');
    expect(wrapper.findComponent(stubs.list).exists()).toBe(false);
    await wrapper.get('.chip').trigger('click');
    expect(wrapper.emitted('toggleDropdown')).toEqual([['agent']]);
    expect(mountChip().findComponent(stubs.list).exists()).toBe(false);
  });

  it('lists options for the active filter and relays choices', () => {
    const options = [{ id: 1, name: 'Jane' }];
    const wrapper = mountChip({
      id: 1,
      options,
      showMenu: true,
      activeFilterType: 'agent',
      placeholder: 'Search agents',
      enableSearch: true,
      showClearFilter: false,
    });
    const list = wrapper.getComponent(stubs.list);
    expect(list.props()).toEqual({
      showClearFilter: false,
      listItems: options,
      activeFilterId: 1,
      inputPlaceholder: 'Search agents',
      enableSearch: true,
    });
    list.vm.$emit('select', options[0]);
    list.vm.$emit('removeFilter');
    clickaway();
    expect(wrapper.emitted('addFilter')).toEqual([[options[0]]]);
    expect(wrapper.emitted('removeFilter')).toEqual([['agent']]);
    expect(wrapper.emitted('closeDropdown')).toHaveLength(1);
  });

  it('skips the list when options are missing', () => {
    const wrapper = mountChip({
      options: null,
      showMenu: true,
      activeFilterType: 'agent',
    });
    expect(wrapper.findComponent(stubs.list).exists()).toBe(false);
  });
});
