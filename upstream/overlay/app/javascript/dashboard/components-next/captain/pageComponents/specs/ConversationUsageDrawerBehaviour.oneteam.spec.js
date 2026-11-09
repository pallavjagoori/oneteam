/**
 * OneTeam behaviour spec for the Captain conversation usage drawer.
 *
 * Covers opening and closing the panel, fetching only with a resource,
 * refetching when the resource changes while open, the subtitle count
 * fallback, and the loading, error, empty, list and load-more states.
 */
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import ConversationUsageDrawer from '../ConversationUsageDrawer.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, { n }) => `${key}:${n}` }),
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

const Button = {
  name: 'Button',
  props: ['label', 'isLoading'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

/**
 * Mounts the drawer.
 *
 * @param {object} props props overrides
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDrawer = (props = {}) =>
  mount(ConversationUsageDrawer, {
    props: {
      resourceId: 7,
      title: 'Refunds',
      conversationCount: 3,
      fetcher: env.apiFetcher,
      emptyStateKey: 'EMPTY',
      ...props,
    },
    global: {
      mocks: { $t: key => key },
      stubs: {
        SidePanel: {
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
        },
        Button,
        NextButton: Button,
        Spinner: { template: '<i class="spinner" />' },
        ReportDrilldownCard: {
          props: ['record'],
          template: '<div class="record" />',
        },
      },
    },
  });

describe('ConversationUsageDrawer behaviour', () => {
  beforeEach(() => {
    env.log = [];
    env.open = vi.fn();
    env.close = vi.fn();
    env.loadMore = vi.fn();
    env.apiFetcher = vi.fn(() => 'fetched');
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
    expect(env.fetcher({ page: 1 })).toBe('fetched');
    expect(env.apiFetcher).toHaveBeenCalledWith({ page: 1 });
    expect(wrapper.text()).toContain(
      'CAPTAIN.DOCUMENTS.USED_IN_CONVERSATIONS:3'
    );

    await wrapper.setProps({ resourceId: 8 });
    expect(env.open).not.toHaveBeenCalled();

    await wrapper.setProps({ open: true });
    expect(env.log).toEqual(['open']);
    expect(env.open).toHaveBeenCalledWith({ resourceId: 8 });

    await wrapper.setProps({ resourceId: 9 });
    expect(env.open).toHaveBeenLastCalledWith({ resourceId: 9 });

    await wrapper.setProps({ resourceId: null });
    expect(env.open).toHaveBeenCalledTimes(2);

    await wrapper.setProps({ open: false });
    expect(env.log).toEqual(['open', 'close']);
    expect(env.close).toHaveBeenCalled();

    wrapper.findComponent({ name: 'SidePanel' }).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('shows the loading, error and empty states', async () => {
    env.drill.isFetching = true;
    const wrapper = mountDrawer();
    expect(wrapper.find('.spinner').exists()).toBe(true);

    env.drill.isFetching = false;
    env.drill.hasError = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('CAPTAIN.OVERVIEW.DRILLDOWN.ERROR');

    env.drill.hasError = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('EMPTY');
  });

  it('lists records, uses the meta count and loads more', async () => {
    env.drill.meta = { conversation_count: 5 };
    env.drill.hasMore = true;
    env.drill.records = [
      { record_type: 'message', message: { id: 1 }, occurred_at: 1 },
      { record_type: 'conversation', conversation: { id: 2 }, occurred_at: 2 },
    ];
    const wrapper = mountDrawer();
    expect(wrapper.findAll('.record')).toHaveLength(2);
    expect(wrapper.text()).toContain(
      'CAPTAIN.DOCUMENTS.USED_IN_CONVERSATIONS:5'
    );

    await wrapper.find('button').trigger('click');
    expect(env.loadMore).toHaveBeenCalled();
  });
});
