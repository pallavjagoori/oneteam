/**
 * OneTeam behaviour spec for the bot report metric cards.
 *
 * Covers skipping the fetch without a full date range, loading and
 * formatting the four metrics, showing "--" for missing rates, and
 * refetching when the filters change.
 */
import { flushPromises, mount } from '@vue/test-utils';
import ReportsAPI from 'dashboard/api/reports';
import BotMetrics from '../BotMetrics.vue';

vi.mock('dashboard/api/reports', () => ({
  default: { getBotMetrics: vi.fn() },
}));

const ReportMetricCard = {
  name: 'ReportMetricCard',
  props: ['label', 'value'],
  template: '<div />',
};

/**
 * Mounts the cards with the given filters.
 *
 * @param {object} filters Report filters.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountMetrics = filters =>
  mount(BotMetrics, {
    props: { filters },
    global: { stubs: { ReportMetricCard }, mocks: { $t: key => key } },
  });

const values = wrapper =>
  wrapper.findAllComponents(ReportMetricCard).map(c => c.props('value'));

describe('BotMetrics behaviour', () => {
  beforeEach(() => {
    ReportsAPI.getBotMetrics.mockResolvedValue({
      data: {
        conversation_count: 1200,
        message_count: 30,
        resolution_rate: 45,
        handoff_rate: 0,
      },
    });
  });

  it('waits for a full date range', () => {
    const wrapper = mountMetrics({ from: 1 });
    expect(ReportsAPI.getBotMetrics).not.toHaveBeenCalled();
    expect(values(wrapper)).toEqual(['0', '0', '0%', '0%']);
    expect(wrapper.vm.$.setupState.formatToPercent('')).toBe('--');
  });

  it('loads and formats the metrics, refetching on filter changes', async () => {
    const wrapper = mountMetrics({ from: 1, to: 2 });
    await flushPromises();
    expect(values(wrapper)).toEqual(['1,200', '30', '45%', '0%']);
    await wrapper.setProps({ filters: { from: 1, to: 3 } });
    expect(ReportsAPI.getBotMetrics).toHaveBeenLastCalledWith({
      from: 1,
      to: 3,
    });
  });
});
