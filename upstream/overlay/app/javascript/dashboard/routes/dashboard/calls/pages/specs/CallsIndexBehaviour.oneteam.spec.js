/**
 * OneTeam behaviour spec for the calls page.
 *
 * Covers the loading spinner, the empty state when voice calls are off
 * (feature flag or no voice inboxes), seeding filters from the URL and
 * writing them back, the admin-only assignee filter (non-admins are
 * scoped to themselves), refetching on filter and page changes, the
 * fetching and no-calls states, and the alert when loading calls fails.
 */
import { nextTick, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CallsIndex from '../CallsIndex.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => ({ replace: env.replace }),
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  until: getter => ({
    toBe: () => {
      env.untilValue = getter();
      return Promise.resolve();
    },
  }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useMapGetter: name => computed(() => env.state[name]),
    useStore: () => ({ dispatch: env.dispatch }),
  };
});
vi.mock('dashboard/composables/useAdmin', async () => {
  const { computed } = await import('vue');
  return { useAdmin: () => ({ isAdmin: computed(() => env.admin) }) };
});
vi.mock('dashboard/stores/callHistory', () => ({
  useCallHistoryStore: () => env.history,
}));
vi.mock('dashboard/helper/inbox', async importOriginal => ({
  ...(await importOriginal()),
  isVoiceCallEnabled: inbox => !!inbox.voice,
}));

const CallsFilterBar = {
  name: 'CallsFilterBar',
  props: [
    'activity',
    'assigneeId',
    'inboxId',
    'totalCount',
    'agents',
    'inboxes',
    'showAssignee',
  ],
  emits: ['update:activity', 'update:assigneeId', 'update:inboxId'],
  template: '<div class="filters" />',
};
const PaginationFooter = {
  name: 'PaginationFooter',
  props: ['currentPage', 'totalItems', 'itemsPerPage'],
  emits: ['update:currentPage'],
  template: '<div class="pages" />',
};

const mountPage = () =>
  mount(CallsIndex, {
    global: {
      stubs: {
        CallsFilterBar,
        PaginationFooter,
        CallListItem: {
          props: ['call'],
          template: '<div class="call">{{ call.id }}</div>',
        },
        CallsEmptyState: { template: '<div class="voice-off" />' },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

const lastFetch = () => env.history.fetchCalls.mock.calls.at(-1)[0];

describe('CallsIndex behaviour', () => {
  beforeEach(() => {
    env.route = { query: {} };
    env.replace = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue();
    env.admin = true;
    env.history = reactive({
      records: [{ id: 11 }, { id: 12 }],
      meta: { count: 30 },
      uiFlags: { isFetching: false },
      fetchCalls: vi.fn().mockResolvedValue(),
    });
    env.state = reactive({
      'inboxes/getInboxes': [
        { id: 2, voice: true },
        { id: 3, voice: false },
      ],
      getCurrentAccountId: 1,
      getCurrentUserID: 7,
      'agents/getVerifiedAgents': [{ id: 4 }],
      'accounts/isFeatureEnabledonAccount': (id, flag) =>
        id === 1 && flag === 'channel_voice',
      'accounts/getUIFlags': { isFetchingItem: false },
    });
  });

  it('restores filters from the link and refetches on changes', async () => {
    env.route.query = {
      activity: 'missed',
      assignee_id: '4',
      inbox_id: '2',
      page: '3',
    };
    const wrapper = mountPage();
    await nextTick();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    await flushPromises();

    expect(env.untilValue).toBe(false);
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/get');
    expect(env.dispatch).toHaveBeenCalledWith('agents/get');
    expect(env.replace).toHaveBeenLastCalledWith({
      query: { activity: 'missed', assignee_id: 4, inbox_id: 2, page: 3 },
    });
    expect(lastFetch()).toEqual({
      page: 3,
      status: 'no-answer',
      direction: 'inbound',
      agent_id: 4,
      inbox_id: 2,
    });
    const filters = wrapper.findComponent(CallsFilterBar);
    expect(filters.props()).toMatchObject({
      totalCount: 30,
      agents: [{ id: 4 }],
      inboxes: [{ id: 2, voice: true }],
      showAssignee: true,
    });
    expect(wrapper.findAll('.call').map(c => c.text())).toEqual(['11', '12']);
    expect(wrapper.findComponent(PaginationFooter).props()).toEqual({
      currentPage: 3,
      totalItems: 30,
      itemsPerPage: 25,
    });

    await filters.vm.$emit('update:activity', 'incoming');
    await flushPromises();
    expect(lastFetch()).toEqual({
      page: 1,
      direction: 'inbound',
      agent_id: 4,
      inbox_id: 2,
    });

    await wrapper
      .findComponent(PaginationFooter)
      .vm.$emit('update:currentPage', 2);
    await flushPromises();
    expect(lastFetch().page).toBe(2);
    expect(env.replace).toHaveBeenLastCalledWith({
      query: { activity: 'incoming', assignee_id: 4, inbox_id: 2, page: 2 },
    });

    env.history.uiFlags.isFetching = true;
    await nextTick();
    expect(filters.props('totalCount')).toBeNull();
    expect(wrapper.find('main .spinner').exists()).toBe(true);

    env.history.uiFlags.isFetching = false;
    env.history.records = [];
    await nextTick();
    expect(wrapper.text()).toContain('CALLS_PAGE.EMPTY_STATE');
    expect(wrapper.findComponent(PaginationFooter).exists()).toBe(false);
  });

  it('scopes agents to their own calls and reports failures', async () => {
    env.admin = false;
    env.route.query = { activity: 'bogus' };
    env.history.fetchCalls.mockRejectedValueOnce(new Error('Calls down'));
    const wrapper = mountPage();
    await flushPromises();

    expect(env.dispatch).not.toHaveBeenCalledWith('agents/get');
    expect(env.replace).toHaveBeenLastCalledWith({ query: {} });
    expect(lastFetch()).toEqual({ page: 1, agent_id: 7 });
    expect(useAlert).toHaveBeenCalledWith('Calls down');
    const filters = wrapper.findComponent(CallsFilterBar);
    expect(filters.props('showAssignee')).toBe(false);

    await filters.vm.$emit('update:assigneeId', null);
    await flushPromises();
    expect(lastFetch()).toEqual({ page: 1 });
  });

  it('starts admins without an assignee filter', async () => {
    mountPage();
    await flushPromises();
    expect(lastFetch()).toEqual({ page: 1 });
  });

  it('shows the voice empty state when calls are unavailable', async () => {
    env.state['accounts/isFeatureEnabledonAccount'] = () => false;
    const off = mountPage();
    await flushPromises();
    expect(off.find('.voice-off').exists()).toBe(true);

    env.state['accounts/isFeatureEnabledonAccount'] = () => true;
    env.state['inboxes/getInboxes'] = [{ id: 3 }];
    const noInbox = mountPage();
    await flushPromises();
    expect(noInbox.find('.voice-off').exists()).toBe(true);
    expect(env.history.fetchCalls).not.toHaveBeenCalled();
  });
});
