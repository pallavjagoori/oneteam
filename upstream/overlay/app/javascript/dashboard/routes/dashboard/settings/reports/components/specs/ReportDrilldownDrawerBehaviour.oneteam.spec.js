/**
 * OneTeam behaviour spec for the report drilldown drawer.
 *
 * Covers keyboard and button navigation between buckets, refetching
 * when the bucket changes, the view all conversations link, the error
 * state, and record keys for message and conversation records.
 */
import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import ReportDrilldownDrawer from '../ReportDrilldownDrawer.vue';

const env = vi.hoisted(() => ({ listeners: {}, state: null }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({
    resolve: ({ query }) => ({ href: `/app?filters=${query.filters}` }),
  }),
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useEventListener: (target, name, handler) => {
    env.listeners[name] = handler;
  },
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () =>
    computed(() => id => (id === 5 ? { title: 'vip' } : null)),
}));
vi.mock('../../composables/useReportDrilldown', () => ({
  useReportDrilldown: () => env.state,
}));
vi.mock('../../helpers/drilldownConversationFilters', () => ({
  canLinkDrilldownToConversations: ({ metric }) => metric !== 'nolink',
  buildDrilldownConversationFilters: ({ labelTitle }) => [{ labelTitle }],
}));

/**
 * Mounts the drawer.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDrawer = props =>
  mount(ReportDrilldownDrawer, {
    props: { metric: 'conversations_count', ...props },
    global: {
      mocks: { $t: key => key },
      stubs: {
        SidePanel: {
          methods: { open: vi.fn(), close: vi.fn() },
          template:
            '<aside><slot name="header" /><slot name="header-actions" /><slot /></aside>',
        },
        Spinner: true,
        ReportDrilldownCard: {
          props: ['record'],
          template: '<div class="card" />',
        },
        Button: {
          props: ['icon', 'disabled'],
          emits: ['click'],
          template: '<button :class="icon" @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('ReportDrilldownDrawer behaviour', () => {
  beforeEach(() => {
    env.listeners = {};
    env.state = {
      records: ref([]),
      meta: ref({}),
      isFetching: ref(false),
      isFetchingMore: ref(false),
      hasError: ref(false),
      hasRecords: computed(() => env.state.records.value.length > 0),
      hasMore: ref(false),
      open: vi.fn(),
      close: vi.fn(),
      loadMore: vi.fn(),
    };
  });

  it('navigates between buckets with keys and buttons', async () => {
    const wrapper = mountDrawer({ canPrev: true, canNext: true });
    env.listeners.keydown({ key: 'ArrowRight' });
    expect(wrapper.emitted('navigate')).toBeUndefined();
    await wrapper.setProps({ open: true });
    env.listeners.keydown({ key: 'ArrowRight' });
    env.listeners.keydown({ key: 'ArrowLeft' });
    env.listeners.keydown({ key: 'Enter' });
    await wrapper.find('.i-ph-caret-left').trigger('click');
    await wrapper.find('.i-ph-caret-right').trigger('click');
    expect(wrapper.emitted('navigate')).toEqual([[1], [-1], [-1], [1]]);
    await wrapper.setProps({ canPrev: false, canNext: false });
    env.listeners.keydown({ key: 'ArrowRight' });
    env.listeners.keydown({ key: 'ArrowLeft' });
    expect(wrapper.emitted('navigate')).toHaveLength(4);
  });

  it('refetches when the bucket changes while open', async () => {
    const wrapper = mountDrawer();
    await wrapper.setProps({ bucketTimestamp: 1 });
    expect(env.state.open).not.toHaveBeenCalled();
    await wrapper.setProps({ open: true });
    await wrapper.setProps({ bucketTimestamp: 2 });
    expect(env.state.open).toHaveBeenCalledTimes(2);
    expect(env.state.open.mock.calls[1][0].bucketTimestamp).toBe(2);
  });

  it('opens all matching conversations in a new tab', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    env.state.meta.value = { bucket: { from: 1 } };
    const wrapper = mountDrawer({ type: 'label', id: 5 });
    await wrapper.find('.i-lucide-external-link').trigger('click');
    expect(openSpy).toHaveBeenCalledWith(
      `/app?filters=${JSON.stringify([{ labelTitle: 'vip' }])}`,
      '_blank',
      'noopener'
    );
    await wrapper.setProps({ id: 6 });
    await wrapper.find('.i-lucide-external-link').trigger('click');
    expect(openSpy).toHaveBeenLastCalledWith(
      `/app?filters=${JSON.stringify([{}])}`,
      '_blank',
      'noopener'
    );
    await wrapper.setProps({ metric: 'nolink' });
    expect(wrapper.find('.i-lucide-external-link').exists()).toBe(false);
    openSpy.mockRestore();
  });

  it('shows the error state and keys records by message or conversation', async () => {
    env.state.hasError.value = true;
    const wrapper = mountDrawer();
    expect(wrapper.text()).toContain('REPORT.DRILLDOWN.ERROR');
    env.state.hasError.value = false;
    env.state.records.value = [
      { record_type: 'message', message: { id: 1 }, occurred_at: 1 },
      { record_type: 'conversation', conversation: { id: 1 }, occurred_at: 1 },
    ];
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.card')).toHaveLength(2);
  });
});
