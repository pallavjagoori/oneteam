/**
 * OneTeam behaviour spec for the Captain overview drilldown drawer.
 *
 * Covers opening and closing the side panel with the `open` prop
 * (fetching the metric's conversations only when a metric and assistant
 * are set), refetching when the metric or range changes while open,
 * closing when the assistant changes, the header (title, value and
 * conversation count), and the loading, error, empty, list and
 * load-more states.
 */
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import CaptainAssistant from 'dashboard/api/captain/assistant';
import AssistantDrilldownDrawer from '../AssistantDrilldownDrawer.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/api/captain/assistant', () => ({
  default: { getDrilldown: vi.fn() },
}));
vi.mock(
  'dashboard/routes/dashboard/settings/reports/composables/useReportDrilldown',
  async () => {
    const { computed } = await import('vue');
    return {
      useReportDrilldown: fetcher => {
        env.fetcher = fetcher;
        const field = key => computed(() => env.drill[key]);
        return {
          records: field('records'),
          meta: field('meta'),
          isFetching: field('isFetching'),
          isFetchingMore: field('isFetchingMore'),
          hasError: field('hasError'),
          hasRecords: computed(() => env.drill.records.length > 0),
          hasMore: field('hasMore'),
          open: env.open,
          close: env.close,
          loadMore: env.loadMore,
        };
      },
    };
  }
);

const SidePanel = {
  name: 'SidePanel',
  emits: ['close'],
  methods: {
    open() {
      env.log.push('open');
    },
    close() {
      env.log.push('close');
    },
  },
  template: '<div><slot name="header" /><slot /></div>',
};
const Button = {
  name: 'Button',
  props: ['label', 'isLoading'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const mountDrawer = (props = {}) =>
  mount(AssistantDrilldownDrawer, {
    props: { assistantId: 3, metric: 'handoffs', range: '7d', ...props },
    global: {
      stubs: {
        SidePanel,
        Button,
        NextButton: Button,
        ReportDrilldownCard: {
          props: ['record'],
          template: '<div class="record" />',
        },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

describe('AssistantDrilldownDrawer behaviour', () => {
  beforeEach(() => {
    env.log = [];
    env.open = vi.fn();
    env.close = vi.fn();
    env.loadMore = vi.fn();
    env.drill = reactive({
      records: [],
      meta: {},
      isFetching: false,
      isFetchingMore: false,
      hasError: false,
      hasMore: false,
    });
  });

  it('opens, fetches, refetches and closes', async () => {
    const wrapper = mountDrawer();
    await wrapper.setProps({ open: true });
    expect(env.log).toEqual(['open']);
    expect(env.open).toHaveBeenCalledWith({
      assistantId: 3,
      metric: 'handoffs',
      range: '7d',
    });

    await wrapper.setProps({ range: '30d' });
    expect(env.open).toHaveBeenLastCalledWith({
      assistantId: 3,
      metric: 'handoffs',
      range: '30d',
    });

    await wrapper.setProps({ open: false });
    expect(env.log).toEqual(['open', 'close']);
    expect(env.close).toHaveBeenCalled();
    await wrapper.setProps({ metric: 'resolved' });
    expect(env.open).toHaveBeenCalledTimes(2);

    env.fetcher({ metric: 'x' });
    expect(CaptainAssistant.getDrilldown).toHaveBeenCalledWith({ metric: 'x' });
  });

  it('skips fetching without a metric and closes on assistant change', async () => {
    const wrapper = mountDrawer({ metric: '' });
    await wrapper.setProps({ open: true });
    expect(env.open).not.toHaveBeenCalled();
    await wrapper.setProps({ assistantId: 4 });
    expect(wrapper.emitted('close')).toHaveLength(1);

    const closed = mountDrawer({ assistantId: null });
    await closed.setProps({ assistantId: 5 });
    expect(closed.emitted('close')).toBeUndefined();
    await closed.findComponent(SidePanel).vm.$emit('close');
    expect(closed.emitted('close')).toHaveLength(1);
  });

  it('shows the header and each state', async () => {
    env.drill.isFetching = true;
    const wrapper = mountDrawer({ metricName: 'Handoffs', metricValue: '12' });
    expect(wrapper.find('h3').text()).toBe('Handoffs');
    expect(wrapper.find('p').text()).toBe('12');
    expect(wrapper.find('.mt-2').text()).toBe('');
    expect(wrapper.find('.spinner').exists()).toBe(true);

    env.drill.isFetching = false;
    env.drill.hasError = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('CAPTAIN.OVERVIEW.DRILLDOWN.ERROR');

    env.drill.hasError = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('CAPTAIN.OVERVIEW.DRILLDOWN.EMPTY');

    env.drill.records = [
      { conversation: { id: 1 }, occurred_at: 10 },
      { occurred_at: 11 },
    ];
    env.drill.meta = { conversation_count: 2 };
    env.drill.hasMore = true;
    env.drill.isFetchingMore = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.record')).toHaveLength(2);
    expect(wrapper.find('.mt-2').text()).toBe(
      'CAPTAIN.OVERVIEW.DRILLDOWN.RESULT_COUNT_CONVERSATION'
    );
    const more = wrapper.findComponent(Button);
    expect(more.props('isLoading')).toBe(true);
    await more.trigger('click');
    expect(env.loadMore).toHaveBeenCalled();
    env.drill.hasMore = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(Button).exists()).toBe(false);

    const plain = mountDrawer();
    expect(plain.find('h3').text()).toBe('');
    expect(plain.find('.mt-1').exists()).toBe(true);
  });
});
