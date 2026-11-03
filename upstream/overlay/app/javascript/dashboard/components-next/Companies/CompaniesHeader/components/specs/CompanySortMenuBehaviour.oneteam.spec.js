/**
 * OneTeam behaviour spec for the companies sort menu.
 *
 * Covers opening and closing the menu (button and outside click), the
 * selected sort and order labels with fallbacks for unknown values, and
 * emitting the new sort or order together with the current other value.
 */
import { mount } from '@vue/test-utils';
import CompanySortMenu from '../CompanySortMenu.vue';

let outside;
const SelectMenu = {
  name: 'SelectMenu',
  props: ['modelValue', 'label', 'options'],
  emits: ['update:modelValue'],
  template: '<div />',
};

const mountMenu = props =>
  mount(CompanySortMenu, {
    props,
    global: {
      stubs: {
        SelectMenu,
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            outside = binding.value;
          },
        },
      },
    },
  });

describe('CompanySortMenu behaviour', () => {
  it('opens, labels and emits sort changes', async () => {
    const wrapper = mountMenu({ activeSort: 'name', activeOrdering: '-' });
    const button = wrapper.find('button');
    await button.trigger('click');
    expect(button.classes()).toContain('bg-n-alpha-2');
    const [sort, order] = wrapper.findAllComponents(SelectMenu);
    expect(sort.props('label')).toBe('COMPANIES.SORT_BY.OPTIONS.NAME');
    expect(order.props('label')).toBe('COMPANIES.ORDER.OPTIONS.DESCENDING');
    sort.vm.$emit('update:modelValue', 'created_at');
    order.vm.$emit('update:modelValue', '');
    expect(wrapper.emitted('update:sort')).toEqual([
      [{ sort: 'created_at', order: '-' }],
      [{ sort: 'name', order: '' }],
    ]);
    await button.trigger('click');
    expect(wrapper.findComponent(SelectMenu).exists()).toBe(false);
  });

  it('falls back for unknown values and closes outside', async () => {
    const wrapper = mountMenu({ activeSort: 'nope', activeOrdering: 'x' });
    await wrapper.find('button').trigger('click');
    const [sort, order] = wrapper.findAllComponents(SelectMenu);
    expect(sort.props('label')).toBe('COMPANIES.SORT_BY.LABEL');
    expect(order.props('label')).toBe('COMPANIES.ORDER.LABEL');
    outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(SelectMenu).exists()).toBe(false);
  });
});
