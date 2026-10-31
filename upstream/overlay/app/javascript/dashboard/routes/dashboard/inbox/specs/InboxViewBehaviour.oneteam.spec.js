/**
 * OneTeam behaviour spec for the notification inbox conversation view.
 *
 * Covers the empty state, loading a conversation (already in the store,
 * fetched, missing, or failing), the loading spinner, the contact side
 * panel, and moving to the previous or next notification (including the
 * list edges and failed reads).
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useTrack } from 'dashboard/composables';
import { emitter } from 'shared/helpers/mitt';
import InboxView from '../InboxView.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.getters[name]),
}));
vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings: computed(() => env.settings) }),
}));
vi.mock('dashboard/composables/useContactConversationNavigation', () => ({
  CONTACT_CONVERSATION_NAVIGATION: 'nav',
  useContactConversationNavigation: () => ({}),
}));
vi.mock('shared/helpers/mitt', () => ({ emitter: { emit: vi.fn() } }));

const Header = {
  name: 'InboxItemHeader',
  props: ['totalLength', 'currentIndex', 'activeNotification'],
  emits: ['next', 'prev'],
  template: '<header />',
};

const item = (id, conversationId, meta) => ({
  id,
  primary_actor_id: conversationId,
  primary_actor_type: 'Conversation',
  primary_actor: { id: conversationId, ...(meta ? { meta } : {}) },
  notification_type: 'assigned',
});
const list = [item(1, 10, { unreadCount: 2 }), item(2, 20), item(3, 30)];

const mountView = ({
  params = { inboxId: '4', id: '20' },
  conversations = {},
  chat = {},
  settings = {},
  flags = {},
  count = 3,
  records = list,
  dispatch = vi.fn(),
} = {}) => {
  env.route = reactive({ params });
  env.router = { push: vi.fn() };
  env.settings = settings;
  env.records = vi.fn(() => records);
  env.getters = reactive({
    'notifications/getFilteredNotifications': filters => env.records(filters),
    getSelectedChat: chat,
    getConversationById: id => conversations[id],
    'notifications/getUIFlags': { isFetching: false, ...flags },
    'notifications/getMeta': { count },
  });
  env.store = { dispatch };
  return mount(InboxView, {
    global: {
      stubs: {
        InboxItemHeader: Header,
        InboxEmptyState: true,
        Spinner: true,
        ConversationBox: { template: '<main><slot /></main>' },
        ConversationSidebar: true,
        SidepanelSwitch: true,
      },
      mocks: { $t: key => key },
    },
  });
};

const calls = action =>
  env.store.dispatch.mock.calls
    .filter(([name]) => name === action)
    .map(([, payload]) => payload);

describe('InboxView behaviour', () => {
  it('shows the empty state without a conversation or while the list loads', () => {
    expect(
      mountView({ params: {} }).find('inbox-empty-state-stub').exists()
    ).toBe(true);
    expect(
      mountView({ records: [], flags: { isFetching: true } })
        .find('inbox-empty-state-stub')
        .exists()
    ).toBe(true);
    expect(
      mountView({ records: null, flags: { isFetching: true } })
        .find('inbox-empty-state-stub')
        .exists()
    ).toBe(true);
    expect(
      mountView({ records: [], flags: { isFetching: false } })
        .find('inbox-empty-state-stub')
        .exists()
    ).toBe(false);
  });

  it('uses the saved sort order', () => {
    mountView({ settings: { inbox_filter_by: { sort_by: 'asc' } } });
    expect(env.records).toHaveBeenCalledWith({ sortOrder: 'asc' });
    mountView();
    expect(env.records).toHaveBeenCalledWith({ sortOrder: 'desc' });
  });

  it('activates a conversation that is already loaded', async () => {
    const wrapper = mountView({ conversations: { 20: { id: 20 } } });
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('clearSelectedState');
    expect(calls('setActiveChat')).toEqual([{ data: { id: 20 } }]);
    expect(emitter.emit).toHaveBeenCalled();
    expect(calls('getConversation')).toEqual([]);
    expect(env.store.dispatch).toHaveBeenCalledWith('agents/get');
    const header = wrapper.findComponent(Header);
    expect(header.props()).toMatchObject({
      totalLength: 3,
      currentIndex: 1,
      activeNotification: list[1],
    });
  });

  it('fetches a conversation and shows a spinner meanwhile', async () => {
    const conversations = {};
    let finish;
    const wrapper = mountView({ conversations });
    await flushPromises();
    env.store.dispatch.mockImplementation(action => {
      if (action === 'getConversation')
        return new Promise(resolve => {
          finish = resolve;
        });
      return undefined;
    });
    env.route.params = { inboxId: '4', id: '30' };
    await flushPromises();
    expect(wrapper.find('spinner-stub').exists()).toBe(true);
    conversations[30] = { id: 30 };
    finish();
    await flushPromises();
    expect(wrapper.find('spinner-stub').exists()).toBe(false);
    expect(calls('setActiveChat')).toEqual([{ data: { id: 30 } }]);
  });

  it('copes with missing conversations and failures', async () => {
    mountView();
    await flushPromises();
    expect(calls('getConversation')).toEqual([20]);
    expect(calls('setActiveChat')).toEqual([]);

    const view = mountView({ conversations: { 20: { id: 20 } } });
    env.store.dispatch.mockRejectedValue(new Error('down'));
    env.route.params = { inboxId: '4', id: '10' };
    await flushPromises();
    expect(view.find('spinner-stub').exists()).toBe(false);

    emitter.emit.mockClear();
    mountView({
      conversations: { 20: { id: 20 } },
      dispatch: vi.fn(action =>
        action === 'setActiveChat'
          ? Promise.reject(new Error('down'))
          : undefined
      ),
    });
    await flushPromises();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('shows the contact panel and side switch for an open chat', () => {
    const conversations = { 20: { id: 20 } };
    let wrapper = mountView({
      conversations,
      chat: { id: 20 },
      settings: { is_contact_sidebar_open: true },
    });
    expect(wrapper.find('conversation-sidebar-stub').exists()).toBe(true);
    expect(wrapper.find('sidepanel-switch-stub').exists()).toBe(true);
    wrapper = mountView({
      conversations,
      chat: { id: 20 },
      settings: { is_contact_sidebar_open: false },
    });
    expect(wrapper.find('conversation-sidebar-stub').exists()).toBe(false);
    wrapper = mountView({
      conversations,
      settings: { is_contact_sidebar_open: true },
    });
    expect(wrapper.find('conversation-sidebar-stub').exists()).toBe(false);
    expect(wrapper.find('sidepanel-switch-stub').exists()).toBe(false);
  });

  it('moves between notifications within the list', async () => {
    const wrapper = mountView();
    const header = wrapper.findComponent(Header);
    await header.vm.$emit('prev');
    await flushPromises();
    expect(calls('notifications/read').at(-1)).toEqual({
      id: 1,
      primaryActorId: 10,
      primaryActorType: 'Conversation',
      unreadCount: 2,
    });
    expect(env.router.push).toHaveBeenLastCalledWith({
      name: 'inbox_view_conversation',
      params: { type: 'conversation', id: 10 },
    });
    expect(useTrack).toHaveBeenCalled();

    await header.vm.$emit('next');
    await flushPromises();
    expect(calls('notifications/read').at(-1)).toEqual({
      id: 3,
      primaryActorId: 30,
      primaryActorType: 'Conversation',
      unreadCount: undefined,
    });

    env.router.push.mockClear();
    env.route.params = { inboxId: '4', id: '10' };
    await flushPromises();
    await wrapper.findComponent(Header).vm.$emit('prev');
    env.route.params = { inboxId: '4', id: '30' };
    await flushPromises();
    await wrapper.findComponent(Header).vm.$emit('next');
    await flushPromises();
    expect(env.router.push).not.toHaveBeenCalled();
  });

  it('skips missing targets and failed reads', async () => {
    const wrapper = mountView({
      count: 10,
      params: { inboxId: '4', id: '30' },
    });
    await wrapper.findComponent(Header).vm.$emit('next');
    await flushPromises();
    expect(calls('notifications/read')).toEqual([]);

    env.store.dispatch.mockRejectedValue(new Error('down'));
    await wrapper.findComponent(Header).vm.$emit('prev');
    await flushPromises();
    expect(env.router.push).not.toHaveBeenCalled();
  });
});
