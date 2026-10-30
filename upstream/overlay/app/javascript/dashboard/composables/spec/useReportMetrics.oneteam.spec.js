import { useReportMetrics } from '../useReportMetrics';

/*
 * OneTeam coverage for displayMetric: an average is shown as a duration,
 * and a count missing from the summary shows 0 rather than NaN.
 */
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ({ value: { previous: {}, reply_time: 90 } }),
}));

describe('useReportMetrics (OneTeam)', () => {
  it('shows a missing count as 0', () => {
    expect(useReportMetrics().displayMetric('conversations_count')).toBe('0');
  });

  it('shows an average as a duration', () => {
    expect(useReportMetrics().displayMetric('reply_time')).toBe('1 Min 30 Sec');
  });
});
