/**
 * OneTeam behaviour spec for the monitor conversations drilldown.
 *
 * Covers opening with the request, the loading, error, empty and list
 * states, loading more, closing, and flagging a changed monitor when
 * the API answers 409.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import MonitorDrilldown from '../MonitorDrilldown.vue';
import MonitorsAPI from 'dashboard/api/monitors';

const env = vi.hoisted(() => ({ fetcher: null, state: null }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/api/monitors', () => ({
  default: { conversations: vi.fn() },
}));
vi.mock('../../composables/useReportDrilldown', () => ({
  useReportDrilldown: fetcher => {
    env.fetcher = fetcher;
    return env.state;
  },
}));

const panelOpen = vi.fn();

/**
 * Mounts the drilldown.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDrilldown = () =>
  mount(MonitorDrilldown, {
    props: { request: { id: 3 }, title: 'Breaches', count: 2 },
    global: {
      stubs: {
        SidePanel: {
          name: 'SidePanel',
          emits: ['afterLeave'],
          methods: { open: () => panelOpen() },
          template: '<aside><slot /></aside>',
        },
        Spinner: { template: '<i class="spinner" />' },
        ReportDrilldownCard: {
          props: ['record'],
          template: '<div class="card" />',
        },
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('MonitorDrilldown behaviour', () => {
  beforeEach(() => {
    env.state = {
      records: ref([]),
      isFetching: ref(true),
      isFetchingMore: ref(false),
      hasError: ref(false),
      hasMore: ref(false),
      open: vi.fn(),
      close: vi.fn(),
      loadMore: vi.fn(),
    };
  });

  it('opens with the request and walks through the states', async () => {
    const wrapper = mountDrilldown();
    expect(panelOpen).toHaveBeenCalled();
    expect(env.state.open).toHaveBeenCalledWith({ id: 3 });
    expect(wrapper.find('.spinner').exists()).toBe(true);
    env.state.isFetching.value = false;
    env.state.hasError.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="alert"]').text()).toBe(
      'REPORT.DRILLDOWN.ERROR'
    );
    env.state.hasError.value = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('REPORT.DRILLDOWN.EMPTY');
    env.state.records.value = [{ conversation: { id: 1 } }];
    env.state.hasMore.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.card')).toHaveLength(1);
    await wrapper.find('button').trigger('click');
    expect(env.state.loadMore).toHaveBeenCalled();
    env.state.hasMore.value = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('button').exists()).toBe(false);
    wrapper.findComponent({ name: 'SidePanel' }).vm.$emit('afterLeave');
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
    expect(env.state.close).toHaveBeenCalled();
  });

  it('flags a changed monitor on 409 and rethrows', async () => {
    const wrapper = mountDrilldown();
    MonitorsAPI.conversations.mockResolvedValueOnce({ data: [] });
    await expect(env.fetcher({ page: 1 })).resolves.toEqual({ data: [] });
    const conflict = { response: { status: 409 } };
    MonitorsAPI.conversations.mockRejectedValueOnce(conflict);
    await expect(env.fetcher({})).rejects.toBe(conflict);
    const other = new Error('down');
    MonitorsAPI.conversations.mockRejectedValueOnce(other);
    await expect(env.fetcher({})).rejects.toBe(other);
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });
});
