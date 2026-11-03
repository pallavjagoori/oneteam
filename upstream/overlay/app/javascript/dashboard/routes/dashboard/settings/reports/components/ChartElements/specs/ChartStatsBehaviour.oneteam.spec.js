/**
 * OneTeam behaviour spec for a report summary metric.
 *
 * Covers the loading, failed and finished states, and trend colours for
 * count and average metrics.
 */
import { mount } from '@vue/test-utils';
import ChartStats from '../ChartStats.vue';

const env = vi.hoisted(() => ({ status: 'finished' }));

vi.mock('dashboard/composables/useReportMetrics', async () => {
  const { computed } = await import('vue');
  return {
    useReportMetrics: () => ({
      calculateTrend: () => 12,
      displayMetric: key => `value-${key}`,
      isAverageMetricType: key => key === 'avg_first_response_time',
      fetchingStatus: computed(() => env.status),
    }),
  };
});

/**
 * Mounts the metric with a fetch status.
 *
 * @param {object} metric - The metric prop.
 * @param {string} status - The fetch status.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountStats = (metric, status = 'finished') => {
  env.status = status;
  return mount(ChartStats, {
    props: { metric },
    global: { stubs: { Spinner: { template: '<i class="spin" />' } } },
  });
};

describe('ChartStats behaviour', () => {
  it('shows the spinner and the failure message', () => {
    expect(
      mountStats({ NAME: 'Chats' }, 'fetching').find('.spin').exists()
    ).toBe(true);
    expect(mountStats({ NAME: 'Chats' }, 'failed').text()).toContain(
      'REPORT.SUMMARY_FETCHING_FAILED'
    );
  });

  it('colours count trends: up is good, down is bad', () => {
    const up = mountStats({
      NAME: 'Chats',
      KEY: 'conversations_count',
      trend: 5,
    });
    expect(up.text()).toContain('value-conversations_count');
    expect(up.find('.border-b-\\[8px\\]').classes()).toContain(
      'text-n-teal-10'
    );
    const down = mountStats({
      NAME: 'Chats',
      KEY: 'conversations_count',
      trend: -5,
    });
    expect(down.find('.border-t-\\[8px\\]').classes()).toContain(
      'text-n-ruby-9'
    );
  });

  it('colours average trends: up is bad, down is good', () => {
    const key = 'avg_first_response_time';
    const up = mountStats({ NAME: 'FRT', KEY: key, trend: 5 });
    expect(up.find('.border-b-\\[8px\\]').classes()).toContain('text-n-ruby-9');
    const down = mountStats({ NAME: 'FRT', KEY: key, trend: -5 });
    expect(down.find('.border-t-\\[8px\\]').classes()).toContain(
      'text-n-teal-10'
    );
  });
});
