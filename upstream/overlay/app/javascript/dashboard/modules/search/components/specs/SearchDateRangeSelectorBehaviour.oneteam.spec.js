/**
 * OneTeam behaviour spec for the search date range filter.
 *
 * Covers the button label for no range, presets and custom ranges,
 * presets limited by the configured search window, choosing and
 * un-choosing presets, filling the custom inputs when reopened (even
 * from a broken stored range), applying and clearing custom dates, and
 * closing on outside clicks.
 */
import { mount } from '@vue/test-utils';
import { getUnixTime } from 'date-fns';
import Selector from '../SearchDateRangeSelector.vue';

const env = vi.hoisted(() => ({}));

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
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (_, binding) => {
      env.outside = binding.value;
    },
  },
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ searchTimeRangeLimitDays: 60 }),
}));

const Button = {
  name: 'Button',
  props: ['label', 'disabled', 'variant'],
  emits: ['click'],
  template: '<button>{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<div class="menu"><slot name="footer" /></div>',
};

const mountSelector = modelValue =>
  mount(Selector, {
    props: modelValue === undefined ? {} : { modelValue },
    global: { stubs: { Button, DropdownMenu } },
  });

const buttons = wrapper => wrapper.findAllComponents(Button);
const toggle = wrapper => buttons(wrapper)[0].vm.$emit('click');
const menu = wrapper => wrapper.findComponent(DropdownMenu);
const inputs = wrapper => wrapper.findAll('input');
const lastChange = wrapper => wrapper.emitted('change').at(-1)[0];

describe('SearchDateRangeSelector behaviour', () => {
  it('opens presets within the search window and picks one', async () => {
    const wrapper = mountSelector();
    expect(buttons(wrapper)[0].props('label')).toBe(
      'SEARCH.DATE_RANGE.TIME_RANGE'
    );
    await toggle(wrapper);
    expect(buttons(wrapper)[0].props('variant')).toBe('faded');
    expect(
      menu(wrapper)
        .props('menuItems')
        .map(i => [i.value, i.isSelected])
    ).toEqual([
      ['last_7_days', false],
      ['last_30_days', false],
      ['last_60_days', false],
    ]);
    await menu(wrapper).vm.$emit('action', menu(wrapper).props('menuItems')[0]);
    const change = lastChange(wrapper);
    expect(change.type).toBe('last_7_days');
    expect(change.to - change.from).toBeGreaterThan(7 * 86400 - 2);
    expect(wrapper.emitted('update:modelValue')[0][0]).toEqual(change);
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('labels presets and clears a preset picked again', async () => {
    const wrapper = mountSelector({ type: 'last_30_days', from: 1, to: 2 });
    expect(buttons(wrapper)[0].props('label')).toBe(
      'SEARCH.DATE_RANGE.TIME_RANGE: SEARCH.DATE_RANGE.LAST_30_DAYS'
    );
    await toggle(wrapper);
    expect(inputs(wrapper)[0].element.value).toBe('');
    const item = menu(wrapper).props('menuItems')[1];
    expect(item.isSelected).toBe(true);
    await menu(wrapper).vm.$emit('action', item);
    expect(lastChange(wrapper)).toEqual({ type: null, from: null, to: null });
  });

  it('labels custom ranges with or without dates', () => {
    const from = getUnixTime(new Date(2026, 0, 15, 12));
    const to = getUnixTime(new Date(2026, 1, 1, 12));
    expect(
      buttons(mountSelector({ type: null, from, to }))[0].props('label')
    ).toBe('SEARCH.DATE_RANGE.TIME_RANGE: Jan 15, 2026 - Feb 1, 2026');
    expect(
      buttons(mountSelector({ type: 'custom', from }))[0].props('label')
    ).toBe('SEARCH.DATE_RANGE.TIME_RANGE: SEARCH.DATE_RANGE.CUSTOM_RANGE');
    expect(buttons(mountSelector(null))[0].props('label')).toBe(
      'SEARCH.DATE_RANGE.TIME_RANGE'
    );
  });

  it('refills custom dates when reopened', async () => {
    const from = getUnixTime(new Date(2026, 0, 15, 12));
    let wrapper = mountSelector({ type: 'between', from, to: from });
    await toggle(wrapper);
    expect(inputs(wrapper).map(i => i.element.value)).toEqual([
      '2026-01-15',
      '2026-01-15',
    ]);
    await toggle(wrapper);
    expect(menu(wrapper).exists()).toBe(false);

    wrapper = mountSelector({ type: 'custom', from: null, to: null });
    await toggle(wrapper);
    expect(inputs(wrapper).map(i => i.element.value)).toEqual(['', '']);

    wrapper = mountSelector({ type: 'between', from: 'bad', to: null });
    await toggle(wrapper);
    expect(inputs(wrapper).map(i => i.element.value)).toEqual(['', '']);

    wrapper = mountSelector(null);
    await toggle(wrapper);
    expect(menu(wrapper).exists()).toBe(true);
  });

  it('applies and clears custom ranges', async () => {
    const wrapper = mountSelector();
    await toggle(wrapper);
    const [, clear, apply] = buttons(wrapper);
    expect(apply.props('disabled')).toBe(true);
    await apply.vm.$emit('click');
    expect(wrapper.emitted('change')).toBeUndefined();

    await inputs(wrapper)[0].setValue('2026-01-10');
    expect(inputs(wrapper)[1].attributes('min')).toBe('2026-01-10');
    await apply.vm.$emit('click');
    expect(wrapper.emitted('change')).toBeUndefined();
    await inputs(wrapper)[0].setValue('');
    await inputs(wrapper)[1].setValue('2026-01-20');
    expect(inputs(wrapper)[0].attributes('max')).toBe('2026-01-20');
    await apply.vm.$emit('click');
    expect(wrapper.emitted('change')).toBeUndefined();

    await inputs(wrapper)[0].setValue('2026-01-10');
    expect(clear.props('disabled')).toBe(false);
    await clear.vm.$emit('click');
    expect(inputs(wrapper).map(i => i.element.value)).toEqual(['', '']);

    await inputs(wrapper)[0].setValue('2026-01-10');
    await inputs(wrapper)[1].setValue('2026-01-20');
    await buttons(wrapper)[2].vm.$emit('click');
    expect(lastChange(wrapper).type).toBe('between');
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('switches presets after a custom range and closes on outside clicks', async () => {
    const wrapper = mountSelector({ type: 'between', from: 1, to: 2 });
    await toggle(wrapper);
    await menu(wrapper).vm.$emit('action', menu(wrapper).props('menuItems')[2]);
    expect(lastChange(wrapper).type).toBe('last_60_days');
    await toggle(wrapper);
    env.outside();
    await wrapper.vm.$nextTick();
    expect(menu(wrapper).exists()).toBe(false);
  });
});
