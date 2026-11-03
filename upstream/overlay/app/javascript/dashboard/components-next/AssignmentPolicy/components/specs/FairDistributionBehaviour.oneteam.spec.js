/**
 * OneTeam behaviour spec for the assignment policy FairDistribution.
 *
 * Covers detecting the window unit, converting minutes to seconds, and
 * coercing invalid numbers to zero.
 */
import { mount } from '@vue/test-utils';
import FairDistribution from '../FairDistribution.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const InputStub = {
  name: 'Input',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input />',
};

const DurationStub = {
  name: 'DurationInput',
  props: ['modelValue', 'unit'],
  emits: ['update:modelValue', 'update:unit'],
  template: '<div />',
};

/**
 * Mounts the component.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountFair = props =>
  mount(FairDistribution, {
    props,
    global: { stubs: { Input: InputStub, DurationInput: DurationStub } },
  });

describe('FairDistribution behaviour', () => {
  it.each([
    [0, 'minutes', 0],
    [86400, 'days', 1440],
    [7200, 'hours', 120],
    [600, 'minutes', 10],
  ])('detects the unit for a %i second window', async (seconds, unit, mins) => {
    const wrapper = mountFair({ fairDistributionWindow: seconds });
    await wrapper.vm.$nextTick();
    const duration = wrapper.findComponent(DurationStub);
    expect(duration.props('unit')).toBe(unit);
    expect(duration.props('modelValue')).toBe(mins);
  });

  it('uses defaults and handles a missing window', async () => {
    const wrapper = mountFair({ fairDistributionWindow: null });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(InputStub).props('modelValue')).toBe(100);
    expect(wrapper.findComponent(DurationStub).props('modelValue')).toBe(0);
  });

  it('emits converted and coerced values', async () => {
    const wrapper = mountFair({});
    const duration = wrapper.findComponent(DurationStub);
    duration.vm.$emit('update:modelValue', 5);
    duration.vm.$emit('update:unit', 'hours');
    wrapper.findComponent(InputStub).vm.$emit('update:modelValue', 'abc');
    wrapper.findComponent(InputStub).vm.$emit('update:modelValue', '7');
    duration.vm.$emit('update:modelValue', Number.NaN);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:fairDistributionWindow')).toEqual([
      [300],
      [0],
    ]);
    expect(wrapper.emitted('update:fairDistributionLimit')).toEqual([[0], [7]]);
    expect(duration.props('unit')).toBe('hours');
  });
});
