/**
 * OneTeam behaviour spec for the agent, inbox, team and label summary
 * report tables.
 *
 * Covers loading the rows and their metrics on mount, the table cells
 * (formatted times and counts, "--" when a metric is missing, the label
 * title fallback), the loading overlay per report type, reloading when
 * the filter changes, retrying a failed report once before alerting, and
 * downloading the report as CSV (skipped for unknown types).
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import SummaryReports from '../SummaryReports.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
    useMapGetter: name =>
      computed(() => env.getters[Array.isArray(name) ? name[0] : name]),
  };
});

const Filters = {
  name: 'OverviewReportFilters',
  props: ['disabled'],
  emits: ['filterChange'],
  template: '<div />',
};
const SummaryReportLink = {
  name: 'SummaryReportLink',
  props: ['row'],
  template: '<a class="link">{{ row.original.name }}</a>',
};

const mountReport = (type = 'agent') =>
  mount(SummaryReports, {
    props: {
      type,
      getterKey: 'rows',
      summaryKey: 'metrics',
      actionKey: 'summaryReports/fetch',
      fetchItemsKey: 'items/get',
    },
    global: {
      stubs: {
        OverviewReportFilters: Filters,
        SummaryReportLink,
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

const cells = wrapper =>
  wrapper
    .findAll('tbody tr')
    .map(row => row.findAll('td').map(td => td.text()));

describe('SummaryReports behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn().mockResolvedValue();
    env.getters = reactive({
      'summaryReports/getUIFlags': {},
      rows: [
        { id: 1, name: 'Ann' },
        { id: 2, title: 'billing' },
      ],
      metrics: [
        {
          id: 1,
          conversationsCount: 1200,
          avgFirstResponseTime: 90,
          avgResolutionTime: 3600,
          avgReplyTime: 30,
          resolvedConversationsCount: 7,
        },
      ],
    });
    useAlert.mockClear();
  });

  it('loads rows and renders formatted metrics', async () => {
    const wrapper = mountReport();
    await flushPromises();
    expect(env.dispatch.mock.calls).toEqual([
      ['items/get'],
      ['summaryReports/fetch', { since: 0, until: 0, businessHours: false }],
    ]);
    const [ann, billing] = cells(wrapper);
    expect(ann[0]).toBe('Ann');
    expect(ann[1]).toBe((1200).toLocaleString());
    expect(ann[5]).toBe('7');
    expect(ann.slice(2, 5).every(text => text !== '--')).toBe(true);
    expect(billing).toEqual(['billing', '--', '--', '--', '--', '--']);
    expect(wrapper.find('thead').text()).toContain('SUMMARY_REPORTS.AGENT');
  });

  it.each([
    ['agent', 'isFetchingAgentSummaryReports'],
    ['inbox', 'isFetchingInboxSummaryReports'],
    ['team', 'isFetchingTeamSummaryReports'],
    ['label', 'isFetchingLabelSummaryReports'],
  ])('shows the %s loading overlay', async (type, flag) => {
    env.getters['summaryReports/getUIFlags'] = { [flag]: true };
    const wrapper = mountReport(type);
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.findComponent(Filters).props('disabled')).toBe(true);
  });

  it('treats unknown report types as not loading', () => {
    env.getters['summaryReports/getUIFlags'] = {
      isFetchingAgentSummaryReports: true,
    };
    const wrapper = mountReport('bot');
    expect(wrapper.find('.spinner').exists()).toBe(false);
  });

  it('reloads on filter change and retries before alerting', async () => {
    const wrapper = mountReport();
    await flushPromises();
    env.dispatch.mockClear();
    env.dispatch.mockResolvedValueOnce().mockRejectedValueOnce(new Error('x'));
    await wrapper
      .findComponent(Filters)
      .vm.$emit('filterChange', { from: 10, to: 20, businessHours: true });
    await flushPromises();
    const params = { since: 10, until: 20, businessHours: true };
    expect(env.dispatch.mock.calls).toEqual([
      ['items/get'],
      ['summaryReports/fetch', params],
      ['summaryReports/fetch', params],
    ]);
    expect(useAlert).not.toHaveBeenCalled();

    env.dispatch
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('x'))
      .mockRejectedValueOnce(new Error('x'));
    await wrapper
      .findComponent(Filters)
      .vm.$emit('filterChange', { from: 10, to: 20, businessHours: true });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('REPORT.SUMMARY_FETCHING_FAILED');
  });

  it.each([
    ['agent', 'downloadAgentReports'],
    ['label', 'downloadLabelReports'],
    ['inbox', 'downloadInboxReports'],
    ['team', 'downloadTeamReports'],
  ])('downloads the %s report', async (type, action) => {
    const wrapper = mountReport(type);
    await wrapper.findComponent(Filters).vm.$emit('filterChange', {
      from: 0,
      to: 1700000000,
      businessHours: true,
    });
    env.dispatch.mockClear();
    wrapper.vm.downloadReports();
    expect(env.dispatch).toHaveBeenCalledWith(action, {
      from: 0,
      to: 1700000000,
      fileName: `${type}-report-14-11-2023-business-hours.csv`,
      businessHours: true,
    });
  });

  it('skips downloads for other report types', async () => {
    const wrapper = mountReport('bot');
    await flushPromises();
    env.dispatch.mockClear();
    wrapper.vm.downloadReports();
    expect(env.dispatch).not.toHaveBeenCalled();
  });
});
