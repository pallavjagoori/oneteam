/**
 * OneTeam behaviour spec for the heatmap report's date range picker.
 *
 * Covers the default "last 7 days" range applied on mount, the day and
 * month menu sections, picking 14/30 day ranges, this month (up to now)
 * and earlier full months (with the month offset event), ignoring other
 * actions, and closing on an outside click.
 */
import { mount } from '@vue/test-utils';
import HeatmapDateRangeSelector from '../HeatmapDateRangeSelector.vue';

const env = vi.hoisted(() => ({ outside: null }));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: initial => {
      const state = appRef(initial);
      const toggle = value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      };
      return [state, toggle];
    },
  };
});
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.outside = binding.value;
    },
  },
}));

const Button = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems', 'menuSections'],
  emits: ['action'],
  template: '<ul class="menu" />',
};

const mountPicker = () =>
  mount(HeatmapDateRangeSelector, {
    global: { stubs: { NextButton: Button, Button, DropdownMenu } },
  });
const pick = async (wrapper, value, action = 'select_date_range') => {
  await wrapper.find('button').trigger('click');
  wrapper.findComponent(DropdownMenu).vm.$emit('action', { action, value });
  await wrapper.vm.$nextTick();
};
const last = (wrapper, event) => wrapper.emitted(event).at(-1);
const day = date => date.toISOString().slice(0, 10);

describe('Heatmap date range selector behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 20, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies the last 7 days on mount and lists both sections', async () => {
    const wrapper = mountPicker();
    expect(wrapper.find('button').text()).toBe('REPORT.DATE_RANGE_OPTIONS.LAST_7_DAYS');
    expect(last(wrapper, 'update:daysNum')).toEqual([6]);
    expect(last(wrapper, 'rangeTypeChange')).toEqual(['day']);
    expect(last(wrapper, 'monthOffsetChange')).toEqual([0]);
    expect(last(wrapper, 'update:from')[0].getDate()).toBe(14);

    await wrapper.find('button').trigger('click');
    const menu = wrapper.findComponent(DropdownMenu);
    const [days, months] = menu.props('menuSections');
    expect(days.items.map(i => i.value)).toEqual(['last_7_days', 'last_14_days', 'last_30_days']);
    expect(months.items.map(i => i.value)).toEqual(['this_month', 'month_-1', 'month_-2']);
    expect(months.items[1].label).toBe('April 2026');
    expect(days.items[0].isSelected).toBe(true);
  });

  it('switches between day ranges and months', async () => {
    const wrapper = mountPicker();
    await pick(wrapper, 'last_30_days');
    expect(wrapper.find('.menu').exists()).toBe(false);
    expect(last(wrapper, 'update:daysNum')).toEqual([29]);

    await pick(wrapper, 'this_month');
    expect(last(wrapper, 'rangeTypeChange')).toEqual(['month']);
    expect(last(wrapper, 'monthOffsetChange')).toEqual([0]);
    expect(last(wrapper, 'update:from')[0].getDate()).toBe(1);
    expect(last(wrapper, 'update:to')[0].getDate()).toBe(20);
    expect(last(wrapper, 'update:daysNum')).toEqual([19]);

    await pick(wrapper, 'month_-1');
    expect(last(wrapper, 'monthOffsetChange')).toEqual([-1]);
    expect(day(last(wrapper, 'update:to')[0])).toBe(day(new Date(2026, 3, 30, 12)));
    expect(last(wrapper, 'update:daysNum')).toEqual([29]);

    await pick(wrapper, 'last_14_days');
    expect(last(wrapper, 'monthOffsetChange')).toEqual([0]);
    expect(last(wrapper, 'update:daysNum')).toEqual([13]);
  });

  it('ignores other actions and closes outside', async () => {
    const wrapper = mountPicker();
    const count = wrapper.emitted('update:daysNum').length;
    await pick(wrapper, 'something', 'other');
    expect(wrapper.emitted('update:daysNum')).toHaveLength(count);
    await wrapper.find('button').trigger('click');
    env.outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.menu').exists()).toBe(false);
  });
});
