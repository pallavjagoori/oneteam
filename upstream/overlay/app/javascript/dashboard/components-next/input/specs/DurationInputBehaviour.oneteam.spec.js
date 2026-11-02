/**
 * OneTeam behaviour spec for the duration input (number plus unit).
 *
 * Supplements the upstream spec. Covers showing minutes as hours or
 * days, storing typed values in minutes for each unit, clearing the
 * value, clamping to min and max on blur and Enter, rounding to the new
 * unit when the unit changes (and doing nothing without a value), and
 * disabling both controls.
 */
import { mount } from '@vue/test-utils';
import DurationInput from '../DurationInput.vue';

const Input = {
  name: 'Input',
  props: { modelValue: [Number, String], disabled: Boolean },
  emits: ['update:modelValue', 'blur'],
  template: '<input class="num" :value="modelValue" />',
};

const mountInput = (modelValue, unit = 'minutes', extra = {}) => {
  const wrapper = mount(DurationInput, {
    props: {
      modelValue,
      unit,
      min: 10,
      max: 3000,
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
      'onUpdate:unit': value => wrapper.setProps({ unit: value }),
      ...extra,
    },
    global: { stubs: { Input } },
  });
  return wrapper;
};

const input = wrapper => wrapper.findComponent(Input);
const shown = wrapper => input(wrapper).props('modelValue');
const type = (wrapper, value) =>
  input(wrapper).vm.$emit('update:modelValue', value);

describe('DurationInput behaviour', () => {
  it('shows the value in the chosen unit', () => {
    expect(shown(mountInput(150))).toBe(150);
    expect(shown(mountInput(150, 'hours'))).toBe(2);
    expect(shown(mountInput(2880, 'days'))).toBe(2);
    expect(shown(mountInput(null, 'days'))).toBe(null);
  });

  it('shows 0 for an unknown unit', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(shown(mountInput(150, 'weeks'))).toBe(0);
    consoleWarn.mockRestore();
  });

  it('stores typed values in minutes and clears empty input', async () => {
    const minutes = mountInput(30);
    await type(minutes, 45.7);
    expect(minutes.props('modelValue')).toBe(45);
    await type(minutes, '');
    expect(minutes.props('modelValue')).toBe(null);

    const hours = mountInput(60, 'hours');
    await type(hours, 3);
    expect(hours.props('modelValue')).toBe(180);
    await type(hours, null);
    expect(hours.props('modelValue')).toBe(null);

    const days = mountInput(1440, 'days');
    await type(days, 2);
    expect(days.props('modelValue')).toBe(2880);
  });

  it('clamps to min and max on blur and Enter', async () => {
    const wrapper = mountInput(5);
    await input(wrapper).vm.$emit('blur');
    expect(wrapper.props('modelValue')).toBe(10);
    await type(wrapper, 5000);
    await input(wrapper).trigger('keydown', { key: 'Enter' });
    expect(wrapper.props('modelValue')).toBe(3000);

    await type(wrapper, '');
    await input(wrapper).vm.$emit('blur');
    expect(wrapper.props('modelValue')).toBe(null);
  });

  it('rounds to the new unit when the unit changes', async () => {
    const wrapper = mountInput(150);
    await wrapper.find('select').setValue('hours');
    expect(wrapper.props('unit')).toBe('hours');
    expect(wrapper.props('modelValue')).toBe(120);

    await wrapper.find('select').setValue('days');
    expect(wrapper.props('modelValue')).toBe(10);

    const empty = mountInput(null);
    await empty.find('select').setValue('days');
    expect(empty.props('modelValue')).toBe(null);
  });

  it('disables both controls', () => {
    const wrapper = mountInput(30, 'minutes', { disabled: true });
    expect(input(wrapper).props('disabled')).toBe(true);
    expect(wrapper.find('select').attributes('disabled')).toBeDefined();
  });
});
