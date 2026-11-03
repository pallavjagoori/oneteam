/**
 * OneTeam behaviour spec for the Captain overview range picker.
 *
 * Covers listing day, week and month ranges, hiding ranges older than the
 * stats history, falling back to the first available range, the
 * insufficient-history state, selecting a range, and closing the menu on
 * a second click or an outside click.
 */
import { mount } from '@vue/test-utils';
import RangeSelector from '../RangeSelector.vue';

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
    useNow: () => appRef(new Date(2026, 10, 18, 12)),
  };
});
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      outside = binding.value;
    },
  },
}));

const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuSections'],
  emits: ['action'],
  template: '<ul />',
};
const Button = {
  name: 'Button',
  props: ['label', 'disabled'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

let wrapper;
const mountSelector = (props = {}) => {
  wrapper = mount(RangeSelector, {
    props: {
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
      ...props,
    },
    global: { stubs: { DropdownMenu, Button } },
  });
  return wrapper;
};
const values = () =>
  wrapper
    .findComponent(DropdownMenu)
    .props('menuSections')
    .map(section => section.items.map(item => item.value));

describe('RangeSelector behaviour', () => {
  it('lists every range and selects one', async () => {
    mountSelector();
    expect(wrapper.text()).toBe('CAPTAIN.OVERVIEW.RANGES.LAST_DAYS');
    await wrapper.find('button').trigger('click');
    expect(values()).toEqual([
      ['7', '30', '90'],
      ['this_week', 'last_week'],
      ['this_month', 'last_month'],
    ]);
    await wrapper
      .findComponent(DropdownMenu)
      .vm.$emit('action', { value: 'last_month' });
    expect(wrapper.props('modelValue')).toBe('last_month');
    expect(wrapper.text()).toBe('CAPTAIN.OVERVIEW.RANGES.LAST_MONTH');
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);

    await wrapper.find('button').trigger('click');
    await wrapper.find('button').trigger('click');
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    await wrapper.find('button').trigger('click');
    outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });

  it('limits ranges to the stats history', async () => {
    mountSelector({
      modelValue: 'last_month',
      statsStartDate: new Date(2026, 10, 9),
    });
    expect(wrapper.emitted('update:modelValue')).toEqual([['7']]);
    await wrapper.find('button').trigger('click');
    expect(values()).toEqual([['7'], ['this_week']]);
  });

  it('shows insufficient history when nothing fits', () => {
    mountSelector({ statsStartDate: new Date(2026, 10, 30) });
    expect(wrapper.text()).toBe('CAPTAIN.OVERVIEW.RANGES.INSUFFICIENT_HISTORY');
    expect(wrapper.findComponent(Button).props('disabled')).toBe(true);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
