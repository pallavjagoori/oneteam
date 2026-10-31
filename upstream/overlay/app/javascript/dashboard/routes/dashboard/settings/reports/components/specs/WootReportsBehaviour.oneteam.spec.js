/**
 * OneTeam behaviour spec for the agent, team, inbox and label reports page.
 *
 * Covers loading the filter items, the report metrics per type (agents
 * skip incoming messages), fetching the summary and every chart after a
 * filter change (single item or list, default grouping), clearing the
 * selection, alerting when a chart request throws, and downloading CSV
 * reports only for known types.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import WootReports from '../WootReports.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/helper/downloadHelper', () => ({
  generateFileName: ({ type, to }) => `${type}-${to}.csv`,
}));

const Filters = {
  name: 'ReportFilters',
  props: ['filterType', 'selectedItem'],
  emits: ['filterChange'],
  template: '<div />',
};
const Container = {
  name: 'ReportContainer',
  props: [
    'groupBy',
    'reportKeys',
    'from',
    'to',
    'reportType',
    'selectedItemId',
    'businessHours',
  ],
  template: '<div class="container" />',
};
const V4Button = {
  name: 'V4Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const mountReports = async (props = {}, items = [{ id: 1 }]) => {
  const $store = { dispatch: vi.fn(), getters: { 'agents/getAgents': items } };
  const wrapper = mount(WootReports, {
    props: { getterKey: 'agents/getAgents', actionKey: 'agents/get', ...props },
    global: {
      stubs: {
        ReportFilters: Filters,
        ReportContainer: Container,
        V4Button,
        ReportHeader: { template: '<header><slot /></header>' },
      },
      mocks: { $store, $t: key => key },
    },
  });
  await flushPromises();
  return { wrapper, $store };
};

const metrics = $store =>
  $store.dispatch.mock.calls
    .filter(([n]) => n === 'fetchAccountReport')
    .map(([, p]) => p.metric);

describe('Woot reports behaviour', () => {
  it('loads filter items and shows report metrics', async () => {
    const { wrapper, $store } = await mountReports({
      type: 'team',
      selectedItem: { id: 4 },
    });
    expect($store.dispatch).toHaveBeenCalledWith('agents/get');
    expect(wrapper.findComponent(Filters).props()).toEqual({
      filterType: 'teams',
      selectedItem: { id: 4 },
    });
    expect(wrapper.findComponent(Container).props()).toMatchObject({
      selectedItemId: 4,
      reportType: 'team',
      groupBy: { id: 1, period: 'day' },
    });
    expect(
      Object.keys(wrapper.findComponent(Container).props('reportKeys'))
    ).toContain('INCOMING_MESSAGES');
  });

  it('hides the charts without items and uses unknown types as is', async () => {
    const { wrapper } = await mountReports({
      type: 'custom',
      getterKey: 'missing/getter',
    });
    expect(wrapper.findComponent(Filters).props('filterType')).toBe('custom');
    expect(wrapper.find('.container').exists()).toBe(false);
  });

  it('fetches the summary and charts after a filter change', async () => {
    const { wrapper, $store } = await mountReports({ type: 'agent' });
    wrapper.findComponent(Filters).vm.$emit('filterChange', {
      from: 10,
      to: 20,
      businessHours: true,
      groupBy: { id: 2, period: 'week' },
      agents: [{ id: 7 }],
    });
    await flushPromises();
    expect($store.dispatch).toHaveBeenCalledWith('fetchAccountSummary', {
      from: 10,
      to: 20,
      type: 'agent',
      id: 7,
      groupBy: 'week',
      businessHours: true,
    });
    expect(metrics($store)).toEqual([
      'conversations_count',
      'outgoing_messages_count',
      'avg_first_response_time',
      'avg_resolution_time',
      'resolutions_count',
      'reply_time',
    ]);
    expect(wrapper.findComponent(Container).props()).toMatchObject({
      from: 10,
      to: 20,
      businessHours: true,
      selectedItemId: 7,
    });
  });

  it('accepts a single item, defaults the grouping and clears the selection', async () => {
    const { wrapper, $store } = await mountReports({ type: 'inbox' });
    wrapper
      .findComponent(Filters)
      .vm.$emit('filterChange', { from: 1, to: 2, inboxes: { id: 3 } });
    await flushPromises();
    expect($store.dispatch).toHaveBeenCalledWith(
      'fetchAccountSummary',
      expect.objectContaining({ id: 3, groupBy: 'day' })
    );
    expect(metrics($store)).toContain('incoming_messages_count');
    $store.dispatch.mockClear();
    wrapper.findComponent(Filters).vm.$emit('filterChange', { from: 1, to: 2 });
    await flushPromises();
    expect($store.dispatch).not.toHaveBeenCalled();
    expect(wrapper.findComponent(Container).props('selectedItemId')).toBeNull();
  });

  it('alerts when a chart request throws', async () => {
    const { wrapper, $store } = await mountReports({ type: 'label' });
    $store.dispatch.mockImplementation(name => {
      if (name === 'fetchAccountReport') throw new Error('x');
    });
    wrapper
      .findComponent(Filters)
      .vm.$emit('filterChange', { from: 1, to: 2, labels: [{ id: 1 }] });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('REPORT.DATA_FETCHING_FAILED');
  });

  it('downloads reports for known types', async () => {
    const cases = [
      ['agent', 'downloadAgentReports'],
      ['label', 'downloadLabelReports'],
      ['inbox', 'downloadInboxReports'],
      ['team', 'downloadTeamReports'],
    ];
    await cases.reduce(async (previous, [type, action]) => {
      await previous;
      const { wrapper, $store } = await mountReports({
        type,
        downloadButtonLabel: 'Get CSV',
      });
      await wrapper.find('button').trigger('click');
      expect($store.dispatch).toHaveBeenCalledWith(action, {
        from: 0,
        to: 0,
        fileName: `${type}-0.csv`,
        businessHours: false,
      });
    }, Promise.resolve());
    const { wrapper, $store } = await mountReports();
    await wrapper.find('button').trigger('click');
    expect($store.dispatch).toHaveBeenCalledTimes(1);
  });
});
