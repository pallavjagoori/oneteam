/**
 * OneTeam behaviour spec for the overview report filters.
 *
 * Covers restoring filters from the URL, the default last seven days,
 * date range and business hours changes, and the disabled state.
 */
import { mount } from '@vue/test-utils';
import OverviewReportFilters from '../OverviewReportFilters.vue';

const env = vi.hoisted(() => ({ query: {}, replace: vi.fn() }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ query: env.query }),
  useRouter: () => ({ replace: env.replace }),
}));

const DatePicker = {
  name: 'WootDatePicker',
  props: ['dateRange', 'rangeType'],
  emits: ['dateRangeChanged'],
  template: '<div class="picker" />',
};
const ToggleSwitch = {
  name: 'ToggleSwitch',
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<button class="toggle" />',
};

/**
 * Mounts the filters.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountFilters = (props = {}) =>
  mount(OverviewReportFilters, {
    props,
    global: {
      mocks: { $t: key => key },
      stubs: { WootDatePicker: DatePicker, ToggleSwitch },
    },
  });

describe('OverviewReportFilters behaviour', () => {
  beforeEach(() => {
    env.query = {};
    env.replace = vi.fn();
  });

  it('restores filters from the url on mount', async () => {
    env.query = {
      from: '1700000000',
      to: '1700500000',
      business_hours: 'true',
      range: 'last30days',
    };
    const wrapper = mountFilters();
    await wrapper.vm.$nextTick();
    const picker = wrapper.findComponent(DatePicker);
    expect(picker.props('rangeType')).toBe('last30days');
    expect(picker.props('dateRange')[0]).toEqual(new Date(1700000000 * 1000));
    expect(wrapper.findComponent(ToggleSwitch).props('modelValue')).toBe(true);
    const [change] = wrapper.emitted('filterChange')[0];
    expect(change.businessHours).toBe(true);
    expect(env.replace.mock.calls[0][0].query).toMatchObject({
      business_hours: 'true',
      range: 'last30days',
    });
  });

  it('defaults to the last seven days and emits changes', async () => {
    const wrapper = mountFilters({ disabled: true });
    expect(wrapper.classes()).toContain('pointer-events-none');
    expect(wrapper.findComponent(DatePicker).props('rangeType')).toBe(
      'last7days'
    );
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 3);
    wrapper
      .findComponent(DatePicker)
      .vm.$emit('dateRangeChanged', [start, end]);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DatePicker).props('rangeType')).toBe('custom');
    wrapper
      .findComponent(DatePicker)
      .vm.$emit('dateRangeChanged', [start, end, 'last3months']);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DatePicker).props('rangeType')).toBe(
      'last3months'
    );
    wrapper.findComponent(ToggleSwitch).vm.$emit('update:modelValue', true);
    wrapper.findComponent(ToggleSwitch).vm.$emit('change');
    const events = wrapper.emitted('filterChange');
    expect(events).toHaveLength(4);
    expect(events[3][0].businessHours).toBe(true);
  });
});
