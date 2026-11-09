/**
 * OneTeam behaviour spec for the Captain overview drilldown drawer.
 *
 * Covers opening with the metric request, refetching when the metric
 * changes, the loading, error, empty and list states, retrying and
 * loading more, episode timestamps, and closing.
 */
import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import OverviewDrilldownDrawer from '../OverviewDrilldownDrawer.vue';
import CaptainAssistantStats from 'dashboard/api/captain/assistantStats';

const env = vi.hoisted(() => ({ state: null, fetcher: null }));
const panelOpen = vi.fn();

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));
vi.mock('shared/composables/useLocale', async () => {
  const { ref: appRef } = await import('vue');
  return { useLocale: () => ({ resolvedLocale: appRef('en-US') }) };
});
vi.mock('dashboard/api/captain/assistantStats', () => ({
  default: { getDrilldown: vi.fn() },
}));
vi.mock(
  'dashboard/routes/dashboard/settings/reports/composables/useReportDrilldown',
  () => ({
    useReportDrilldown: fetcher => {
      env.fetcher = fetcher;
      return env.state;
    },
  })
);

/**
 * Mounts the drawer.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDrawer = () =>
  mount(OverviewDrilldownDrawer, {
    props: {
      assistantId: 4,
      metric: {
        key: 'handoffs',
        reason: 'low',
        label: 'Handoffs',
        value: '12',
      },
      range: '7d',
    },
    global: {
      directives: { tooltip: {} },
      stubs: {
        SidePanel: {
          name: 'SidePanel',
          emits: ['close', 'afterLeave'],
          methods: { open: () => panelOpen() },
          template: '<aside><slot name="header" /><slot /></aside>',
        },
        MetricHint: true,
        Spinner: { template: '<i class="spinner" />' },
        ReportDrilldownCard: {
          props: ['record'],
          template: '<div class="card"><slot name="timestamp" /></div>',
        },
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

describe('OverviewDrilldownDrawer behaviour', () => {
  beforeEach(() => {
    env.state = {
      records: ref([]),
      meta: ref({}),
      isFetching: ref(true),
      isFetchingMore: ref(false),
      hasError: ref(false),
      hasRecords: computed(() => env.state.records.value.length > 0),
      hasMore: ref(false),
      open: vi.fn(),
      close: vi.fn(),
      loadMore: vi.fn(),
    };
  });

  it('opens, refetches and closes', async () => {
    const wrapper = mountDrawer();
    expect(panelOpen).toHaveBeenCalled();
    expect(env.state.open).toHaveBeenCalledWith({
      assistantId: 4,
      metric: 'handoffs',
      reason: 'low',
      range: '7d',
    });
    expect(wrapper.find('.spinner').exists()).toBe(true);
    await wrapper.setProps({ metric: { key: 'csat', label: 'CSAT' } });
    expect(env.state.open).toHaveBeenCalledTimes(2);
    env.fetcher({ page: 1 });
    expect(CaptainAssistantStats.getDrilldown).toHaveBeenCalledWith({
      page: 1,
    });
    const panel = wrapper.findComponent({ name: 'SidePanel' });
    panel.vm.$emit('close');
    expect(env.state.close).toHaveBeenCalled();
    panel.vm.$emit('afterLeave');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('retries a failed first page and loads more after records', async () => {
    env.state.isFetching.value = false;
    env.state.hasError.value = true;
    const wrapper = mountDrawer();
    expect(wrapper.text()).not.toContain('DRILLDOWN.COUNT');
    await wrapper.find('button').trigger('click');
    expect(env.state.open).toHaveBeenCalledTimes(2);
    env.state.records.value = [
      { episode_id: 1, episode_started_at: 1767225600 },
    ];
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.card').text()).toContain('2026');
    await wrapper.find('button').trigger('click');
    expect(env.state.loadMore).toHaveBeenCalledTimes(1);
  });

  it('shows the count, the empty state and load more', async () => {
    env.state.isFetching.value = false;
    const wrapper = mountDrawer();
    expect(wrapper.text()).toContain(
      'CAPTAIN.OVERVIEW.V2.DRILLDOWN.COUNT:{"count":0}'
    );
    expect(wrapper.text()).toContain('CAPTAIN.OVERVIEW.DRILLDOWN.EMPTY');
    env.state.meta.value = { total_count: 3 };
    env.state.records.value = [{ episode_id: 1, episode_started_at: 0 }];
    env.state.hasMore.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('{"count":3}');
    await wrapper.find('button').trigger('click');
    expect(env.state.loadMore).toHaveBeenCalled();
    env.state.hasMore.value = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('button').exists()).toBe(false);
  });
});
