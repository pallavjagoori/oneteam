import Report from 'dashboard/api/reports';
import liveReports from 'dashboard/api/liveReports';
import { downloadCsvFile } from 'dashboard/helper/downloadHelper';
import AnalyticsHelper from 'dashboard/helper/AnalyticsHelper';
import reports from '../../reports';
import { STATUS } from '../../../constants';
import { buildStore } from '../../../specs/oneteamStore';

/*
 * OneTeam coverage for the reports Vuex module, run as a real store so the
 * actions, mutations and getters are checked together: chart series, heat
 * maps, summaries, live overview metrics and CSV downloads.
 */
vi.mock('dashboard/api/reports', () => ({
  default: Object.fromEntries(
    [
      'getReports',
      'getSummary',
      'getBotSummary',
      'getAgentReports',
      'getConversationsSummaryReports',
      'getLabelReports',
      'getInboxReports',
      'getTeamReports',
      'getConversationTrafficCSV',
    ].map(name => [name, vi.fn()])
  ),
}));
vi.mock('dashboard/api/liveReports', () => ({
  default: {
    getConversationMetric: vi.fn(),
    getGroupedConversations: vi.fn(),
  },
}));
vi.mock('dashboard/helper/downloadHelper', () => ({
  downloadCsvFile: vi.fn(),
  generateFileName: ({ type, to }) => `${type}-${to}.csv`,
}));
vi.mock('dashboard/helper/AnalyticsHelper', () => ({
  default: { track: vi.fn() },
}));

const flush = () =>
  new Promise(resolve => {
    setTimeout(resolve, 0);
  });

describe('reports store (OneTeam)', () => {
  let store;

  beforeEach(() => {
    store = buildStore({ reports });
  });

  afterEach(() => vi.clearAllMocks());

  it('loads a metric series, dropping points outside the range', async () => {
    Report.getReports.mockResolvedValue({
      data: [
        { timestamp: 50, value: 1 },
        { timestamp: 150, value: 2 },
      ],
    });
    store.dispatch('fetchAccountReport', {
      metric: 'conversations_count',
      from: 100,
      to: 200,
    });
    expect(store.getters.getAccountReports.isFetching.conversations_count).toBe(
      true
    );
    await flush();
    const report = store.getters.getAccountReports;
    expect(report.data.conversations_count).toEqual([
      { timestamp: 150, value: 2 },
    ]);
    expect(report.isFetching.conversations_count).toBe(false);
  });

  it.each([
    [
      'fetchAccountConversationHeatmap',
      'getAccountConversationHeatmapData',
      'isFetchingAccountConversationsHeatmap',
    ],
    [
      'fetchAccountResolutionHeatmap',
      'getAccountResolutionHeatmapData',
      'isFetchingAccountResolutionsHeatmap',
    ],
  ])('%s loads hourly data', async (action, getter, flag) => {
    Report.getReports.mockResolvedValue({ data: [{ timestamp: 150 }] });
    store.dispatch(action, { from: 100, to: 200 });
    expect(store.getters.getOverviewUIFlags[flag]).toBe(true);
    await flush();
    expect(Report.getReports).toHaveBeenCalledWith({
      from: 100,
      to: 200,
      groupBy: 'hour',
    });
    expect(store.getters[getter]).toEqual([{ timestamp: 150 }]);
    expect(store.getters.getOverviewUIFlags[flag]).toBe(false);
  });

  it('loads the account summary, or marks it failed', async () => {
    Report.getSummary.mockResolvedValueOnce({
      data: { conversations_count: 4 },
    });
    store.dispatch('fetchAccountSummary', {
      from: 1,
      to: 2,
      type: 'account',
      id: 1,
      groupBy: 'day',
      businessHours: true,
    });
    expect(store.getters.getAccountSummaryFetchingStatus).toBe(STATUS.FETCHING);
    await flush();
    expect(Report.getSummary).toHaveBeenCalledWith(
      1,
      2,
      'account',
      1,
      'day',
      true
    );
    expect(store.getters.getAccountSummary).toEqual({ conversations_count: 4 });
    expect(store.getters.getAccountSummaryFetchingStatus).toBe(STATUS.FINISHED);

    Report.getSummary.mockRejectedValueOnce(new Error('down'));
    store.dispatch('fetchAccountSummary', {});
    await flush();
    expect(store.getters.getAccountSummaryFetchingStatus).toBe(STATUS.FAILED);
  });

  it('loads the bot summary, or marks it failed', async () => {
    Report.getBotSummary.mockResolvedValueOnce({
      data: { bot_handoffs_count: 2 },
    });
    store.dispatch('fetchBotSummary', { from: 1, to: 2, groupBy: 'day' });
    expect(store.getters.getBotSummaryFetchingStatus).toBe(STATUS.FETCHING);
    await flush();
    expect(Report.getBotSummary).toHaveBeenCalledWith({
      from: 1,
      to: 2,
      groupBy: 'day',
      businessHours: undefined,
    });
    expect(store.getters.getBotSummary).toEqual({ bot_handoffs_count: 2 });
    expect(store.getters.getBotSummaryFetchingStatus).toBe(STATUS.FINISHED);

    Report.getBotSummary.mockRejectedValueOnce(new Error('down'));
    store.dispatch('fetchBotSummary', {});
    await flush();
    expect(store.getters.getBotSummaryFetchingStatus).toBe(STATUS.FAILED);
  });

  describe('live overview metrics', () => {
    it.each([
      [
        'fetchAccountConversationMetric',
        'getConversationMetric',
        'getAccountConversationMetric',
        'isFetchingAccountConversationMetric',
        undefined,
      ],
      [
        'fetchAgentConversationMetric',
        'getGroupedConversations',
        'getAgentConversationMetric',
        'isFetchingAgentConversationMetric',
        { groupBy: 'assignee_id' },
      ],
      [
        'fetchTeamConversationMetric',
        'getGroupedConversations',
        'getTeamConversationMetric',
        'isFetchingTeamConversationMetric',
        { groupBy: 'team_id' },
      ],
    ])(
      '%s stores the data and clears loading on failure',
      async (action, method, getter, flag, args) => {
        liveReports[method].mockResolvedValueOnce({ data: ['m'] });
        store.dispatch(action);
        expect(store.getters.getOverviewUIFlags[flag]).toBe(true);
        await flush();
        expect(liveReports[method]).toHaveBeenCalledWith(args || {});
        expect(store.getters[getter]).toEqual(['m']);
        expect(store.getters.getOverviewUIFlags[flag]).toBe(false);

        liveReports[method].mockRejectedValueOnce(new Error('down'));
        store.dispatch(action);
        await flush();
        expect(store.getters.getOverviewUIFlags[flag]).toBe(false);
      }
    );
  });

  describe('CSV downloads', () => {
    it.each([
      ['downloadAgentReports', 'getAgentReports', 'agent'],
      [
        'downloadConversationsSummaryReports',
        'getConversationsSummaryReports',
        'conversations_summary',
      ],
      ['downloadLabelReports', 'getLabelReports', 'label'],
      ['downloadInboxReports', 'getInboxReports', 'inbox'],
      ['downloadTeamReports', 'getTeamReports', 'team'],
    ])('%s saves the CSV and tracks it', async (action, method, reportType) => {
      Report[method].mockResolvedValueOnce({ data: 'a,b' });
      const params = { fileName: 'r.csv', businessHours: true };
      await store.dispatch(action, params);
      expect(Report[method]).toHaveBeenCalledWith(params);
      expect(downloadCsvFile).toHaveBeenCalledWith('r.csv', 'a,b');
      expect(AnalyticsHelper.track).toHaveBeenCalledWith(expect.any(String), {
        reportType,
        businessHours: true,
      });
    });

    it.each([
      'downloadAgentReports',
      'downloadConversationsSummaryReports',
      'downloadLabelReports',
      'downloadInboxReports',
      'downloadTeamReports',
    ])('%s logs a failed download', async action => {
      const error = new Error('down');
      Object.values(Report).forEach(fn => fn.mockRejectedValueOnce(error));
      // eslint-disable-next-line no-console
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      await store.dispatch(action, { fileName: 'r.csv' });
      expect(log).toHaveBeenCalledWith(error);
      expect(downloadCsvFile).not.toHaveBeenCalled();
      log.mockRestore();
      Object.values(Report).forEach(fn => fn.mockReset());
    });

    it('downloads the conversation traffic heat map', async () => {
      Report.getConversationTrafficCSV.mockResolvedValueOnce({ data: 'x' });
      store.dispatch('downloadAccountConversationHeatmap', {
        daysBefore: 7,
        to: 99,
      });
      await flush();
      expect(Report.getConversationTrafficCSV).toHaveBeenCalledWith({
        daysBefore: 7,
      });
      expect(downloadCsvFile).toHaveBeenCalledWith(
        'Conversation traffic-99.csv',
        'x'
      );
      expect(AnalyticsHelper.track).toHaveBeenCalledWith(expect.any(String), {
        reportType: 'conversation_heatmap',
        businessHours: false,
      });

      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      Report.getConversationTrafficCSV.mockRejectedValueOnce(new Error('x'));
      store.dispatch('downloadAccountConversationHeatmap', { daysBefore: 7 });
      await flush();
      expect(log).toHaveBeenCalled();
      log.mockRestore();
    });
  });
});
