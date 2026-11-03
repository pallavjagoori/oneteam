/**
 * OneTeam behaviour spec for a list-type custom attribute.
 *
 * Covers the value or "select" placeholder, opening the options by
 * clicking the value (read view) or the pencil (editing view), the
 * options with the current value selected (and no options), choosing a
 * value, deleting, and closing on an outside click.
 */
import { mount } from '@vue/test-utils';
import ListAttribute from '../ListAttribute.vue';

let outside;
vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = appRef(false);
      const toggle = value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      };
      return [state, toggle];
    },
  };
});

const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul />',
};
const Button = {
  name: 'Button',
  props: ['icon'],
  emits: ['click'],
  template: '<button :class="icon" @click="$emit(\'click\')" />',
};

const mountAttribute = props =>
  mount(ListAttribute, {
    props,
    global: {
      stubs: { DropdownMenu, Button },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            outside = binding.value;
          },
        },
      },
    },
  });

describe('ListAttribute behaviour', () => {
  it('opens from the value, selects an option and closes outside', async () => {
    const wrapper = mountAttribute({
      attribute: { value: 'b', attributeValues: ['a', 'b'] },
    });
    expect(wrapper.find('span').text()).toBe('b');
    await wrapper.find('span').trigger('click');
    const menu = wrapper.findComponent(DropdownMenu);
    expect(menu.props('menuItems')).toEqual([
      { label: 'a', value: 'a', action: 'select', isSelected: false },
      { label: 'b', value: 'b', action: 'select', isSelected: true },
    ]);
    await menu.vm.$emit('action', { value: 'a' });
    expect(wrapper.emitted('update')).toEqual([['a']]);
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);

    await wrapper.find('span').trigger('click');
    outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });

  it('uses the pencil and trash buttons in the editing view', async () => {
    const wrapper = mountAttribute({ attribute: {}, isEditingView: true });
    expect(wrapper.find('span').text()).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.TRIGGER.SELECT'
    );
    await wrapper.find('span').trigger('click');
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    await wrapper.find('.i-lucide-pencil').trigger('click');
    expect(wrapper.findComponent(DropdownMenu).props('menuItems')).toEqual([]);
    await wrapper.find('.i-lucide-trash').trigger('click');
    expect(wrapper.emitted('delete')).toHaveLength(1);
  });
});
