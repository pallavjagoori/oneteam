/**
 * OneTeam behaviour spec for the Captain assistant overview (v2) page.
 *
 * APIs, route, policy and Captain limits are faked. Covers loading the
 * report, summary and FAQ stats (including failures and superseded
 * requests), metric formatting and trend colours, durable resolution
 * when it does not apply, drilldowns for administrators, range changes,
 * assistant switches, and the billing and FAQ review links.
 */
import { reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import CaptainAssistantStats from 'dashboard/api/captain/assistantStats';
import CaptainAssistant from 'dashboard/api/captain/assistant';
import OverviewV2 from '../OverviewV2.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, values) => {
      if (values?.value !== undefined)
        return `${values.value} ${key.split('.').pop()}`;
      if (values?.total !== undefined) return `of ${values.total}`;
      return key;
    },
  }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => env.user,
}));
vi.mock('dashboard/composables/useCaptain', () => ({
  useCaptain: () => env.captain,
}));
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ checkPermissions: () => env.admin }),
}));
vi.mock('dashboard/api/captain/assistantStats', () => ({
  default: {
    getOverview: vi.fn(),
    getResolutionFlow: vi.fn(),
    getResolutionTrend: vi.fn(),
    getOverviewSummary: vi.fn(),
  },
}));
vi.mock('dashboard/api/captain/assistant', () => ({
  default: { getFaqStats: vi.fn() },
}));

const named = (name, props = [], emits = []) => ({
  name,
  props,
  emits,
  template: `<div class="${name}" />`,
});
const Summary = named(
  'OverviewSummaryCard',
  [
    'userName',
    'points',
    'featuredMetrics',
    'metrics',
    'loading',
    'summaryLoading',
  ],
  ['metricClick']
);
const Flow = named(
  'ResolutionFlowCard',
  ['flow', 'loading', 'canDrilldown'],
  ['drilldown']
);
const Usage = named('UsageCard', ['loading'], ['refresh', 'buy']);
const Knowledge = named(
  'KnowledgeCoverageCard',
  ['knowledge', 'loading'],
  ['review']
);
const Coverage = named('CoverageBanner', ['knowledge']);
const Csat = named('CsatCard', ['autonomous', 'assisted', 'humanOnly']);
const Trend = named('ResolutionTrendCard', ['trend', 'loading']);
const Range = named(
  'RangeSelector',
  ['modelValue', 'statsStartDate'],
  ['update:modelValue']
);
const Drawer = named(
  'OverviewDrilldownDrawer',
  ['assistantId', 'metric', 'range'],
  ['close']
);

const ok = data => Promise.resolve({ data });
const abortError = () =>
  Object.assign(new Error('aborted'), { name: 'AbortError' });

const fullOverview = {
  tracking_started_at: '2026-01-01',
  hours_saved: { current: 120, trend: -150 },
  durable_resolution_rate: { current: 80, trend: 5 },
  conversations_handled: { current: 1200, trend: 0 },
  auto_resolution_rate: { current: 50, trend: null },
  autonomous_resolutions: { current: 600 },
  handoff_rate: { current: 20, trend: 3 },
  handoff_count: { current: 240 },
  conversation_depth: { current: 3.456, trend: 1 },
  reopen_rate: { current: 4, trend: -2 },
  median_resolution_seconds: { current: 5400, trend: -90 },
  autonomous_csat_score: 90,
};

const mountPage = async () => {
  const wrapper = mount(OverviewV2, {
    global: {
      stubs: {
        PageLayout: {
          template:
            '<div><slot name="headerActions" /><slot name="paywall" /><slot name="body" /></div>',
        },
        CaptainPaywall: true,
        InboxBanner: true,
        QuickLinks: true,
        OverviewSummaryCard: Summary,
        ResolutionFlowCard: Flow,
        UsageCard: Usage,
        KnowledgeCoverageCard: Knowledge,
        CoverageBanner: Coverage,
        CsatCard: Csat,
        ResolutionTrendCard: Trend,
        RangeSelector: Range,
        OverviewDrilldownDrawer: Drawer,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const summary = wrapper => wrapper.findComponent(Summary);
const metric = (wrapper, key) =>
  [
    ...summary(wrapper).props('featuredMetrics'),
    ...summary(wrapper).props('metrics'),
  ].find(item => item.key === key);

describe('Captain OverviewV2 behaviour', () => {
  beforeEach(() => {
    env.route = reactive({ params: { accountId: 1, assistantId: 7 } });
    env.router = { push: vi.fn() };
    env.user = ref({ name: 'Ada Lovelace' });
    env.admin = true;
    env.captain = {
      responseLimits: ref({}),
      documentLimits: ref({}),
      isFetchingLimits: ref(false),
      fetchLimits: vi.fn(),
    };
    CaptainAssistantStats.getOverview.mockImplementation(() =>
      ok(fullOverview)
    );
    CaptainAssistantStats.getResolutionFlow.mockImplementation(() =>
      ok({ flow: 1 })
    );
    CaptainAssistantStats.getResolutionTrend.mockImplementation(() =>
      ok({ trend: 1 })
    );
    CaptainAssistantStats.getOverviewSummary.mockImplementation(() =>
      ok({ points: ['Busy week'] })
    );
    CaptainAssistant.getFaqStats.mockImplementation(() => ok({ pending: 3 }));
  });

  it('loads every card for the assistant and range', async () => {
    const wrapper = await mountPage();
    expect(env.captain.fetchLimits).toHaveBeenCalled();
    expect(CaptainAssistantStats.getOverview).toHaveBeenCalledWith(
      expect.objectContaining({ assistantId: 7, range: 'this_month' })
    );
    expect(summary(wrapper).props('userName')).toBe('Ada');
    expect(summary(wrapper).props('points')).toEqual(['Busy week']);
    expect(wrapper.findComponent(Flow).props('flow')).toEqual({ flow: 1 });
    expect(wrapper.findComponent(Trend).props('trend')).toEqual({ trend: 1 });
    expect(wrapper.findComponent(Csat).props('autonomous')).toBe(90);
    expect(wrapper.findComponent(Knowledge).props('knowledge')).toEqual({
      pending: 3,
    });
    expect(wrapper.findComponent(Coverage).props('knowledge')).toEqual({
      pending: 3,
    });
    expect(wrapper.findComponent(Range).props('statsStartDate')).toEqual(
      new Date('2026-01-01')
    );
  });

  it('formats metrics and trend directions', async () => {
    const wrapper = await mountPage();
    expect(metric(wrapper, 'hours_saved')).toMatchObject({
      value: '5 DAYS',
      trend: '-6 DAYS',
      trendGood: false,
      trendUp: false,
      valueClass: 'text-n-iris-11',
      clickable: false,
    });
    expect(metric(wrapper, 'durable_resolution_rate')).toMatchObject({
      value: '80%',
      trend: '+5%',
      trendGood: true,
      clickable: true,
    });
    expect(metric(wrapper, 'conversations_handled')).toMatchObject({
      value: (1200).toLocaleString(),
      trend: '0%',
      trendGood: null,
      trendUp: null,
    });
    expect(metric(wrapper, 'auto_resolution_rate')).toMatchObject({
      trend: '',
      trendUp: null,
      supportingValue: (600).toLocaleString(),
      supportingText: 'of 1200',
    });
    expect(metric(wrapper, 'handoff_rate')).toMatchObject({
      trend: '+3%',
      trendGood: false,
    });
    expect(metric(wrapper, 'conversation_depth')).toMatchObject({
      value: '3.5',
      trend: '+1',
      trendGood: null,
    });
    expect(metric(wrapper, 'reopen_rate')).toMatchObject({ trendGood: true });
    expect(metric(wrapper, 'median_resolution_seconds')).toMatchObject({
      value: '1.5 HOURS',
      trend: '-2 MINUTES',
      trendGood: true,
    });
  });

  it('formats short durations and rising times', async () => {
    CaptainAssistantStats.getOverview.mockImplementation(() =>
      ok({
        hours_saved: { current: 12, trend: 3 },
        median_resolution_seconds: { current: 120, trend: 7200 },
        durable_resolution_rate: { current: null },
      })
    );
    const wrapper = await mountPage();
    expect(metric(wrapper, 'hours_saved')).toMatchObject({
      value: '12 HOURS',
      trend: '+3 HOURS',
    });
    expect(metric(wrapper, 'median_resolution_seconds')).toMatchObject({
      value: '2 MINUTES',
      trend: '+2.0 HOURS',
    });
    expect(metric(wrapper, 'durable_resolution_rate')).toMatchObject({
      value: '—',
      clickable: false,
      valueClass: 'text-n-slate-11',
      hint: 'CAPTAIN.OVERVIEW.V2.METRICS.DURABLE.NOT_APPLICABLE_HINT',
      hintNote: '',
    });
    expect(wrapper.findComponent(Range).exists()).toBe(false);
  });

  it('formats zero trends without a sign', async () => {
    CaptainAssistantStats.getOverview.mockImplementation(() =>
      ok({
        hours_saved: { current: 1, trend: 0 },
        median_resolution_seconds: { current: 60, trend: 0 },
      })
    );
    CaptainAssistantStats.getOverviewSummary.mockResolvedValueOnce({
      data: {},
    });
    const wrapper = await mountPage();
    expect(metric(wrapper, 'hours_saved').trend).toBe('0 HOURS');
    expect(metric(wrapper, 'median_resolution_seconds').trend).toBe(
      '0 MINUTES'
    );
    expect(summary(wrapper).props('points')).toEqual([]);
  });

  it('shows dashes and defaults when the reports fail', async () => {
    env.user.value = null;
    CaptainAssistantStats.getOverview.mockRejectedValue(new Error('down'));
    CaptainAssistantStats.getResolutionFlow.mockRejectedValue(
      new Error('down')
    );
    CaptainAssistantStats.getOverviewSummary.mockRejectedValue(
      new Error('down')
    );
    CaptainAssistant.getFaqStats.mockRejectedValue(new Error('down'));
    const wrapper = await mountPage();
    expect(summary(wrapper).props('userName')).toBe(
      'CAPTAIN.OVERVIEW.V2.SUMMARY.DEFAULT_NAME'
    );
    expect(summary(wrapper).props('points')).toEqual([]);
    expect(metric(wrapper, 'hours_saved').value).toBe('—');
    expect(wrapper.findComponent(Flow).props('flow')).toBeNull();
    expect(wrapper.findComponent(Knowledge).props('knowledge')).toBeNull();
    expect(wrapper.findComponent(Coverage).props('knowledge')).toBeUndefined();
  });

  it('keeps the old report when a request is aborted', async () => {
    CaptainAssistantStats.getOverview.mockRejectedValueOnce(abortError());
    CaptainAssistantStats.getOverviewSummary.mockRejectedValueOnce(
      abortError()
    );
    CaptainAssistant.getFaqStats.mockRejectedValueOnce(abortError());
    const wrapper = await mountPage();
    expect(summary(wrapper).props('points')).toEqual([]);
    expect(wrapper.findComponent(Knowledge).props('knowledge')).toBeNull();
    expect(wrapper.findComponent(Flow).props('flow')).toBeNull();
  });

  it('opens drilldowns for administrators and refetches on range change', async () => {
    const wrapper = await mountPage();
    await summary(wrapper).vm.$emit('metricClick', 'handoff_rate');
    expect(wrapper.findComponent(Drawer).props()).toMatchObject({
      assistantId: 7,
      metric: 'handoff_rate',
      range: 'this_month',
    });
    await wrapper.findComponent(Drawer).vm.$emit('close');
    expect(wrapper.findComponent(Drawer).exists()).toBe(false);
    await wrapper.findComponent(Flow).vm.$emit('drilldown', 'stayed_closed');
    expect(wrapper.findComponent(Drawer).props('metric')).toBe('stayed_closed');

    await wrapper
      .findComponent(Range)
      .vm.$emit('update:modelValue', 'last_month');
    await flushPromises();
    expect(wrapper.findComponent(Drawer).exists()).toBe(false);
    expect(CaptainAssistantStats.getOverview).toHaveBeenLastCalledWith(
      expect.objectContaining({ range: 'last_month' })
    );
    expect(CaptainAssistant.getFaqStats).toHaveBeenCalledTimes(1);

    env.route.params.assistantId = 9;
    await flushPromises();
    expect(CaptainAssistant.getFaqStats).toHaveBeenLastCalledWith(
      expect.objectContaining({ assistantId: 9 })
    );
  });

  it('hides drilldowns from agents', async () => {
    env.admin = false;
    const wrapper = await mountPage();
    expect(metric(wrapper, 'handoff_rate').clickable).toBe(false);
    await summary(wrapper).vm.$emit('metricClick', 'handoff_rate');
    expect(wrapper.findComponent(Drawer).exists()).toBe(false);
  });

  it('links to billing, FAQ review and refreshes limits', async () => {
    const wrapper = await mountPage();
    await wrapper.findComponent(Usage).vm.$emit('buy');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 1 },
    });
    await wrapper.findComponent(Knowledge).vm.$emit('review');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'captain_assistants_faq_suggestions',
      params: { accountId: 1, assistantId: 7 },
    });
    await wrapper.findComponent(Usage).vm.$emit('refresh');
    expect(env.captain.fetchLimits).toHaveBeenCalledTimes(2);
  });
});
