/**
 * OneTeam behaviour spec for the "add filter" chip on report pages.
 *
 * Covers toggling the menu, the empty state, opening a filter's
 * sub-menu on hover or focus (and closing it on mouse leave), the
 * sub-menu's search placeholder and search switch, adding a filter, and
 * closing the menu on a click outside.
 */
import { mount } from '@vue/test-utils';
import AddFilterChip from '../AddFilterChip.vue';

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
    props: ['listItems', 'inputPlaceholder', 'enableSearch'],
    emits: ['select'],
    template: '<ul><slot name="listItem" /></ul>',
  },
  item: {
    name: 'FilterListItemButton',
    props: ['buttonText'],
    emits: ['mouseenter', 'mouseleave', 'focus'],
    template: '<li>{{ buttonText }}<slot name="dropdown" /></li>',
  },
  empty: {
    name: 'FilterDropdownEmptyState',
    props: ['message'],
    template: '<p class="empty">{{ message }}</p>',
  },
}));

vi.mock('dashboard/components/ui/Dropdown/DropdownButton.vue', () => ({
  default: stubs.button,
}));
vi.mock('dashboard/components/ui/Dropdown/DropdownList.vue', () => ({
  default: stubs.list,
}));
vi.mock('dashboard/components/ui/Dropdown/DropdownListItemButton.vue', () => ({
  default: stubs.item,
}));
vi.mock('dashboard/components/ui/Dropdown/DropdownEmptyState.vue', () => ({
  default: stubs.empty,
}));

const menuOption = [
  {
    id: 'agent',
    name: 'Agent',
    type: 'agent',
    options: [{ id: 1, name: 'Jane' }],
  },
  { id: 'none', name: 'No options', type: 'none' },
];

let clickaway;
const mountChip = props =>
  mount(AddFilterChip, {
    props: { name: 'Add filter', showMenu: true, menuOption, ...props },
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

const subMenu = wrapper =>
  wrapper.findAllComponents(stubs.list).find(list => list.props('listItems'));

describe('AddFilterChip behaviour', () => {
  it('toggles the menu and shows the empty state', async () => {
    const closed = mountChip({ showMenu: false });
    expect(closed.findComponent(stubs.list).exists()).toBe(false);
    await closed.find('.chip').trigger('click');
    expect(closed.emitted('toggleDropdown')).toHaveLength(1);

    const empty = mountChip({ menuOption: [], emptyStateMessage: 'Nothing' });
    expect(empty.find('.empty').text()).toBe('Nothing');
  });

  it('opens a sub-menu on hover or focus and adds a filter', async () => {
    const wrapper = mountChip({
      placeholderI18nKey: 'REPORT.FILTER',
      enableSearch: false,
    });
    const [agent, none] = wrapper.findAllComponents(stubs.item);
    expect(subMenu(wrapper)).toBeUndefined();

    await agent.vm.$emit('mouseenter');
    expect(subMenu(wrapper).props()).toMatchObject({
      listItems: [{ id: 1, name: 'Jane' }],
      inputPlaceholder: 'REPORT.FILTER.AGENT',
      enableSearch: false,
    });
    await agent.vm.$emit('mouseleave');
    expect(subMenu(wrapper)).toBeUndefined();

    await none.vm.$emit('focus');
    expect(subMenu(wrapper)).toBeUndefined();

    await agent.vm.$emit('focus');
    await subMenu(wrapper).vm.$emit('select', { id: 1, name: 'Jane' });
    expect(wrapper.emitted('addFilter')).toEqual([[{ id: 1, name: 'Jane' }]]);
    expect(subMenu(wrapper)).toBeUndefined();
  });

  it('closes on a click outside', async () => {
    const wrapper = mountChip();
    await wrapper.findAllComponents(stubs.item)[0].vm.$emit('mouseenter');
    clickaway();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('closeDropdown')).toHaveLength(1);
    expect(subMenu(wrapper)).toBeUndefined();
  });
});
