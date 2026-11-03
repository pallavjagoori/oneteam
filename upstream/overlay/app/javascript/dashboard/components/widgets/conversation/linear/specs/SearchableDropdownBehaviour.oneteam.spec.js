/**
 * OneTeam behaviour spec for the Linear SearchableDropdown.
 *
 * Covers the placeholder and selected name, the error message, opening
 * the list, selecting an item, and closing on click away.
 */
import { mount } from '@vue/test-utils';
import SearchableDropdown from '../SearchableDropdown.vue';

const clickaway = vi.hoisted(() => ({ handler: null }));

const ListStub = {
  name: 'FilterListDropdown',
  props: ['activeFilterId'],
  emits: ['select'],
  template: '<ul class="list" />',
};

const ITEMS = [
  { id: 1, name: 'Todo' },
  { id: 2, name: 'Done' },
];

/**
 * Mounts the dropdown.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDropdown = props =>
  mount(SearchableDropdown, {
    props: { type: 'stateId', items: ITEMS, placeholder: 'Pick', ...props },
    global: {
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            clickaway.handler = binding.value;
          },
        },
      },
      stubs: {
        FilterButton: {
          props: ['buttonText'],
          emits: ['click'],
          template:
            '<div><button @click="$emit(\'click\')">{{ buttonText }}</button><slot name="dropdown" /></div>',
        },
        FilterListDropdown: ListStub,
      },
    },
  });

describe('SearchableDropdown behaviour', () => {
  it('shows the placeholder and an error', () => {
    const wrapper = mountDropdown({ error: 'Required', label: 'State' });
    expect(wrapper.find('button').text()).toBe('Pick');
    expect(wrapper.find('label').classes()).toContain('error');
    expect(wrapper.text()).toContain('Required');
  });

  it('shows the placeholder for an unknown value', () => {
    expect(mountDropdown({ value: 9 }).find('button').text()).toBe('Pick');
  });

  it('opens, selects an item and closes', async () => {
    const wrapper = mountDropdown({ value: 2 });
    expect(wrapper.find('button').text()).toBe('Done');
    await wrapper.find('button').trigger('click');
    expect(wrapper.classes()).toContain('h-[150px]');
    const list = wrapper.findComponent(ListStub);
    expect(list.props('activeFilterId')).toBe(2);
    list.vm.$emit('select', ITEMS[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('change')).toEqual([[ITEMS[0], 'stateId']]);
    expect(wrapper.find('.list').exists()).toBe(false);
  });

  it('closes on click away for other types', async () => {
    const wrapper = mountDropdown({ type: 'teamId' });
    await wrapper.find('button').trigger('click');
    expect(wrapper.classes()).toContain('gap-2');
    clickaway.handler();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.list').exists()).toBe(false);
  });
});
