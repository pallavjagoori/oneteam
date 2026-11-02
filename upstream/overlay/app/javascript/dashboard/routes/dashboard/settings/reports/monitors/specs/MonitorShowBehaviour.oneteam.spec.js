/**
 * OneTeam behaviour spec for the monitor report page, filling the gaps
 * left by Chatwoot's own MonitorShow spec.
 *
 * Covers the monitor icon in the header, the header actions (duplicate,
 * pause, delete) and leaving the page after a delete, the linked
 * automations section (creating one, editing from the name or the hover
 * action, active and disabled labels, a failed load, and ignoring a
 * stale response after switching monitors), refreshing after the
 * drilldown reports changed results, closing the drilldown (also when
 * the viewer stops being an admin), and the monitor id passed to live
 * refresh.
 */
import { shallowMount, flushPromises } from '@vue/test-utils';
import { computed, reactive, ref } from 'vue';
import MonitorShow from '../MonitorShow.vue';
import MonitorsAPI from 'dashboard/api/monitors';
import AutomationAPI from 'dashboard/api/automation';

const state = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => state.route,
  useRouter: () => state.router,
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountId: computed(() => Number(state.route.params.accountId)),
    currentAccount: computed(() => state.account),
    accountScopedRoute: (name, params, query) => ({ name, query }),
    isCloudFeatureEnabled: () => true,
  }),
}));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: state.isAdmin }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key, te: () => true, locale: ref('en') }),
}));
vi.mock('../useMonitorRefresh', () => ({
  useMonitorRefresh: (refresh, options) => {
    state.refresh = refresh;
    state.refreshOptions = options;
  },
}));
vi.mock('dashboard/api/monitors', () => ({
  default: { timeseries: vi.fn(), retry: vi.fn() },
}));
vi.mock('dashboard/api/automation', () => ({
  default: { linkedToMonitor: vi.fn() },
}));

const responseFor = (params, monitor = {}) => ({
  data: {
    interval: params.interval,
    data_revision: 1,
    total_count: 2,
    buckets: [{ start: params.since, count: 2, covered: true }],
    monitor: {
      name: 'Refunds',
      icon: 'fire-line',
      icon_color: '#EF4444',
      condition: 'refund',
      processing: { state: 'live', error_codes: [] },
      ...monitor,
    },
  },
});

const MonitorActionDialog = {
  name: 'MonitorActionDialog',
  emits: ['saved', 'changed'],
  methods: {
    open(...args) {
      state.opened.push(args);
    },
    close() {},
  },
  template: '<div />',
};

const mountPage = () =>
  shallowMount(MonitorShow, {
    global: {
      renderStubDefaultSlot: true,
      directives: { tooltip: {} },
      stubs: {
        MonitorActionDialog,
        ReportHeader: {
          template: '<header><slot name="icon" /><slot /></header>',
        },
        Label: {
          props: ['label', 'color'],
          template:
            '<span class="label">{{ label }}<slot name="icon" /></span>',
        },
        HoverActions: {
          name: 'HoverActions',
          emits: ['action'],
          template: '<div class="hover"><slot /></div>',
        },
      },
    },
  });

const button = (wrapper, icon) =>
  wrapper
    .findAllComponents({ name: 'Button' })
    .find(b => b.props('icon') === icon);

describe('MonitorShow behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-22T12:00:00Z'));
    state.route = reactive({ params: { accountId: '1', monitorId: '10' } });
    state.account = reactive({ reporting_timezone: 'UTC' });
    state.router = { push: vi.fn(), replace: vi.fn() };
    state.opened = [];
    state.isAdmin = ref(true);
    MonitorsAPI.timeseries.mockReset();
    MonitorsAPI.timeseries.mockImplementation((id, params) =>
      Promise.resolve(responseFor(params))
    );
    AutomationAPI.linkedToMonitor.mockReset();
    AutomationAPI.linkedToMonitor.mockResolvedValue({
      data: {
        payload: [
          { id: 5, name: 'Escalate refunds', active: true },
          { id: 6, name: 'Tag refunds', active: false },
        ],
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the header actions', async () => {
    const wrapper = mountPage();
    await flushPromises();
    expect(state.refreshOptions.monitorId()).toBe(10);
    expect(wrapper.findComponent({ name: 'EmojiIcon' }).props()).toMatchObject({
      value: 'fire-line',
      color: '#EF4444',
    });

    await button(wrapper, 'i-woot-clone').vm.$emit('click');
    expect(state.router.push).toHaveBeenCalledWith({
      name: 'monitor_reports_index',
      query: { condition: 'refund' },
    });
    await button(wrapper, 'i-ph-pause').vm.$emit('click');
    await button(wrapper, 'i-woot-bin').vm.$emit('click');
    expect(state.opened.map(([action]) => action)).toEqual(['pause', 'delete']);
    expect(state.opened[1][1]).toMatchObject({ id: '10', name: 'Refunds' });

    wrapper.findComponent(MonitorActionDialog).vm.$emit('saved', 'delete');
    expect(state.router.push).toHaveBeenLastCalledWith({
      name: 'monitor_reports_index',
      query: undefined,
    });
    wrapper.unmount();
  });

  it('lists linked automations and opens them', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const labels = wrapper.findAll('.label');
    expect(labels.map(l => l.text())).toEqual([
      'MONITORS.AUTOMATIONS.ACTIVE',
      'MONITORS.AUTOMATIONS.DISABLED',
    ]);
    expect(labels[0].find('.bg-n-teal-9').exists()).toBe(true);
    expect(labels[1].find('.bg-n-teal-9').exists()).toBe(false);

    await button(wrapper, 'i-lucide-plus').vm.$emit('click');
    expect(state.router.push).toHaveBeenLastCalledWith({
      name: 'automation_list',
      query: { monitor_id: '10' },
    });
    await wrapper.find('li button').trigger('click');
    expect(state.router.push).toHaveBeenLastCalledWith({
      name: 'automation_list',
      query: { edit_id: 5 },
    });
    wrapper.findAllComponents({ name: 'HoverActions' })[1].vm.$emit('action');
    expect(state.router.push).toHaveBeenLastCalledWith({
      name: 'automation_list',
      query: { edit_id: 6 },
    });
    wrapper.unmount();
  });

  it('reports a failed automations load', async () => {
    AutomationAPI.linkedToMonitor.mockRejectedValue(new Error('down'));
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find('p[role="alert"]').text()).toBe(
      'MONITORS.AUTOMATIONS.FETCH_FAILED'
    );
    wrapper.unmount();
  });

  it('ignores automations that arrive for another monitor', async () => {
    let finish;
    AutomationAPI.linkedToMonitor.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    AutomationAPI.linkedToMonitor.mockResolvedValue({ data: { payload: [] } });
    const wrapper = mountPage();
    await flushPromises();
    state.route.params.monitorId = '11';
    await flushPromises();
    finish({ data: { payload: [{ id: 9, name: 'Stale', active: true }] } });
    await flushPromises();
    expect(wrapper.text()).not.toContain('Stale');
    wrapper.unmount();
  });

  it('refreshes after the drilldown changes results and when it closes', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const chart = wrapper.findComponent({ name: 'BarChart' });
    chart.vm.$emit('itemClick', { pointIndex: 0 });
    await flushPromises();
    wrapper.findComponent({ name: 'MonitorDrilldown' }).vm.$emit('changed');
    await flushPromises();
    expect(wrapper.findComponent({ name: 'MonitorDrilldown' }).exists()).toBe(
      false
    );
    expect(
      wrapper
        .findAllComponents({ name: 'Banner' })
        .some(banner => banner.text() === 'MONITORS.RESULTS_UPDATED')
    ).toBe(true);
    expect(MonitorsAPI.timeseries).toHaveBeenCalledTimes(2);

    chart.vm.$emit('itemClick', { pointIndex: 0 });
    await flushPromises();
    wrapper.findComponent({ name: 'MonitorDrilldown' }).vm.$emit('close');
    await flushPromises();
    expect(MonitorsAPI.timeseries).toHaveBeenCalledTimes(3);

    chart.vm.$emit('itemClick', { pointIndex: 0 });
    await flushPromises();
    state.isAdmin.value = false;
    await flushPromises();
    expect(wrapper.findComponent({ name: 'MonitorDrilldown' }).exists()).toBe(
      false
    );
    wrapper.unmount();
  });
});
