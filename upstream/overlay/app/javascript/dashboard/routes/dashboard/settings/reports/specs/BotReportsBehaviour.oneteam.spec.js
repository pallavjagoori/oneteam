/**
 * OneTeam behaviour spec for the bot reports page.
 *
 * Covers the default filters, applying a filter (summary and both bot
 * chart metrics fetched with the period, the metrics and charts updated,
 * and a tracking event), and the alerts when the summary or a chart
 * fails to load.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import BotReports from '../BotReports.vue';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

const ReportFilters = {
  name: 'ReportFilters',
  props: ['showEntityFilter', 'showGroupBy', 'showBusinessHours'],
  emits: ['filterChange'],
  template: '<div />',
};
const BotMetrics = {
  name: 'BotMetrics',
  props: ['filters'],
  template: '<div />',
};
const ReportContainer = {
  name: 'ReportContainer',
  props: ['groupBy', 'reportKeys', 'from', 'to', 'businessHours'],
  template: '<div />',
};

const mountPage = dispatch =>
  mount(BotReports, {
    global: {
      mocks: { $store: { dispatch } },
      stubs: {
        ReportHeader: {
          props: ['headerTitle'],
          template: '<h1>{{ headerTitle }}</h1>',
        },
        ReportFilters,
        BotMetrics,
        ReportContainer,
      },
    },
  });

const filter = {
  from: 100,
  to: 200,
  groupBy: { id: 2, period: 'week' },
  businessHours: true,
};

describe('BotReports behaviour', () => {
  beforeEach(() => {
    useAlert.mockClear();
    useTrack.mockClear();
  });

  it('shows the defaults and applies a filter', async () => {
    const dispatch = vi.fn().mockResolvedValue();
    const wrapper = mountPage(dispatch);
    expect(wrapper.find('h1').text()).toBe('BOT_REPORTS.HEADER');
    expect(wrapper.findComponent(ReportFilters).props()).toEqual({
      showEntityFilter: false,
      showGroupBy: '',
      showBusinessHours: false,
    });
    expect(wrapper.findComponent(ReportContainer).props('groupBy').period).toBe(
      'day'
    );

    await wrapper.findComponent(ReportFilters).vm.$emit('filterChange', filter);
    await flushPromises();
    const payload = {
      from: 100,
      to: 200,
      groupBy: 'week',
      businessHours: true,
    };
    expect(dispatch.mock.calls).toEqual([
      ['fetchBotSummary', payload],
      ['fetchAccountReport', { metric: 'bot_resolutions_count', ...payload }],
      ['fetchAccountReport', { metric: 'bot_handoffs_count', ...payload }],
    ]);
    expect(wrapper.findComponent(BotMetrics).props('filters')).toEqual({
      from: 100,
      to: 200,
    });
    expect(wrapper.findComponent(ReportContainer).props()).toMatchObject({
      from: 100,
      to: 200,
      businessHours: true,
      groupBy: filter.groupBy,
    });
    expect(useTrack).toHaveBeenCalledWith('Used filters in the reports', {
      filterValue: filter,
      reportType: 'bots',
    });
    expect(useAlert).not.toHaveBeenCalled();
  });

  it('alerts when the summary or charts fail', async () => {
    const dispatch = vi.fn(action => {
      if (action === 'fetchBotSummary') throw new Error('down');
      return Promise.reject(new Error('down'));
    });
    const wrapper = mountPage(dispatch);
    await wrapper
      .findComponent(ReportFilters)
      .vm.$emit('filterChange', { ...filter, groupBy: undefined });
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith(
      'fetchBotSummary',
      expect.objectContaining({ groupBy: undefined })
    );
    expect(useAlert.mock.calls).toEqual([
      ['REPORT.SUMMARY_FETCHING_FAILED'],
      ['REPORT.DATA_FETCHING_FAILED'],
      ['REPORT.DATA_FETCHING_FAILED'],
    ]);
  });
});
