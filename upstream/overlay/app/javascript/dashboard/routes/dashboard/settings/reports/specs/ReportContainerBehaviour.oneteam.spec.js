/**
 * OneTeam behaviour spec for the report charts grid.
 *
 * Complements Chatwoot's ReportContainer spec. Covers the chart labels for
 * weekly, monthly and yearly grouping, an empty chart for a metric with
 * no data, and closing an open drilldown.
 */
import { shallowMount } from '@vue/test-utils';
import ReportContainer from '../ReportContainer.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useReportMetrics', () => ({
  useReportMetrics: () => ({
    calculateTrend: () => 0,
    isAverageMetricType: () => false,
  }),
}));

// 2021-05-19 12:00 UTC, a Wednesday.
const timestamp = 1621425600;
const metric = { KEY: 'conversations_count', NAME: 'Conversations' };

const Drawer = {
  name: 'ReportDrilldownDrawer',
  props: ['open', 'metric'],
  emits: ['close'],
  template: '<div />',
};

const mountContainer = period =>
  shallowMount(ReportContainer, {
    props: {
      from: 1621103400,
      to: 1621621800,
      groupBy: { period },
      reportKeys: { CONVERSATIONS: 'conversations_count' },
    },
    global: {
      mocks: {
        $store: {
          getters: {
            getAccountReports: {
              isFetching: { conversations_count: false },
              data: { conversations_count: [{ value: 3, timestamp }] },
            },
            getCurrentRole: 'administrator',
          },
        },
      },
      stubs: { ChartStats: true, ReportDrilldownDrawer: Drawer },
    },
  });

describe('ReportContainer behaviour', () => {
  it('labels weekly, monthly and yearly buckets', () => {
    const categories = period =>
      mountContainer(period).vm.getChartData(metric).categories;
    expect(categories('week')).toEqual(['16-May - 22-May']);
    expect(categories('month')).toEqual(['May-2021']);
    expect(categories('year')).toEqual(['2021']);
    expect(categories('day')).toEqual(['19-May']);
  });

  it('returns an empty chart for a metric without data', () => {
    expect(
      mountContainer('day').vm.getChartData({ KEY: 'missing', NAME: 'x' })
    ).toEqual({ categories: [], series: [] });
  });

  it('closes an open drilldown', async () => {
    const wrapper = mountContainer('day');
    wrapper.vm.openDrilldownAt(metric, 0);
    await wrapper.vm.$nextTick();
    const drawer = wrapper.findComponent(Drawer);
    expect(drawer.props('open')).toBe(true);
    await drawer.vm.$emit('close');
    expect(drawer.props('open')).toBe(false);
    expect(wrapper.vm.drilldownMetric).toBeNull();
    expect(wrapper.vm.drilldownIndex).toBeNull();
  });
});
