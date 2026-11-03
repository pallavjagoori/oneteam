/**
 * OneTeam behaviour spec for the SLA report filter bar.
 *
 * Covers defaulting to the last seven days (and writing it to the URL)
 * when the URL has no dates, reading dates from the URL, keeping the
 * agent, inbox, team, policy and label filters when the dates change,
 * the date picker's v-model updates, and forwarding SLA filter changes.
 */
import { mount } from '@vue/test-utils';
import SLAReportFilters from '../SLAReportFilters.vue';

const env = vi.hoisted(() => ({ query: {}, replace: vi.fn() }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ query: env.query }),
  useRouter: () => ({ replace: env.replace }),
}));

const WootDatePicker = {
  name: 'WootDatePicker',
  props: ['dateRange', 'rangeType'],
  emits: ['dateRangeChanged', 'update:dateRange', 'update:rangeType'],
  template: '<div class="picker" />',
};
const SLAFilter = {
  name: 'SLAFilter',
  emits: ['filterChange'],
  template: '<div class="sla" />',
};

/**
 * Mounts the filters with the given URL query.
 *
 * @param {object} query Route query.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountFilters = query => {
  env.query = query;
  return mount(SLAReportFilters, {
    global: { stubs: { WootDatePicker, SLAFilter } },
  });
};

describe('SLAReportFilters behaviour', () => {
  beforeEach(() => {
    env.replace = vi.fn();
  });

  it('defaults to the last seven days and writes it to the URL', () => {
    const wrapper = mountFilters({});
    const [{ query }] = env.replace.mock.calls[0];
    expect(query.range).toBe('last7days');
    expect(query.to - query.from).toBeGreaterThan(6 * 86400);
    expect(wrapper.emitted('filterChange')[0][0]).toEqual({
      from: query.from,
      to: query.to,
    });
  });

  it('reads dates from the URL without rewriting it', () => {
    const wrapper = mountFilters({ from: '1700000000', to: '1700500000' });
    expect(env.replace).not.toHaveBeenCalled();
    const picker = wrapper.getComponent(WootDatePicker);
    expect(picker.props('dateRange')[0]).toEqual(new Date(1700000000 * 1000));
    expect(picker.props('rangeType')).toBe('last7days');
  });

  it('keeps the other filters when the dates change', () => {
    const wrapper = mountFilters({
      from: '1700000000',
      to: '1700500000',
      range: 'custom',
      agent_id: '1',
      inbox_id: '2',
      team_id: '3',
      sla_policy_id: '4',
      label: 'vip',
    });
    const picker = wrapper.getComponent(WootDatePicker);
    picker.vm.$emit('dateRangeChanged', [
      new Date(2024, 0, 1),
      new Date(2024, 0, 2),
      'custom',
    ]);
    expect(env.replace.mock.calls[0][0].query).toMatchObject({
      range: 'custom',
      agent_id: 1,
      inbox_id: 2,
      team_id: 3,
      sla_policy_id: 4,
      label: 'vip',
    });
  });

  it('applies the picker v-model updates', async () => {
    const wrapper = mountFilters({ from: '1700000000', to: '1700500000' });
    const picker = wrapper.getComponent(WootDatePicker);
    const range = [new Date(2024, 1, 1), new Date(2024, 1, 3)];
    picker.vm.$emit('update:dateRange', range);
    picker.vm.$emit('update:rangeType', 'custom');
    await wrapper.vm.$nextTick();
    expect(picker.props('dateRange')).toEqual(range);
    expect(picker.props('rangeType')).toBe('custom');
  });

  it('forwards SLA filter changes with the current dates', () => {
    const wrapper = mountFilters({ from: '1700000000', to: '1700500000' });
    wrapper.getComponent(SLAFilter).vm.$emit('filterChange', { label: 'x' });
    const [payload] = wrapper.emitted('filterChange').at(-1);
    expect(payload.label).toBe('x');
    expect(payload.from).toBeTypeOf('number');
  });
});
