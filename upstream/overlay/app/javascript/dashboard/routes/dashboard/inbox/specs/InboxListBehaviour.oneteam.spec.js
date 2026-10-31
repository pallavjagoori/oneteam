/**
 * OneTeam behaviour spec for the notification inbox list.
 *
 * Covers restoring saved filters, fetching and paging notifications,
 * filter changes, the loading, empty and end-of-list states, highlighting
 * and scrolling to the open conversation, marking read/unread, deleting
 * (with redirects back to the inbox), opening a conversation, and the
 * context-menu flag passed to the header.
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import InboxList from '../InboxList.vue';

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
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings: env.uiSettings }),
}));

const Card = {
  name: 'InboxCard',
  props: ['inboxItem', 'stateInbox'],
  emits: [
    'markNotificationAsRead',
    'markNotificationAsUnRead',
    'deleteNotification',
    'contextMenuOpen',
    'contextMenuClose',
  ],
  template: '<div class="card" />',
};
const Header = {
  name: 'InboxListHeader',
  props: ['isContextMenuOpen'],
  emits: ['filter', 'redirect'],
  template: '<header />',
};
const Observer = {
  name: 'IntersectionObserver',
  props: ['options'],
  emits: ['observed'],
  template: '<span class="observer" />',
};

const notification = (id, conversationId) => ({
  id,
  primaryActorId: conversationId,
  primaryActorType: 'Conversation',
  primaryActor: { inboxId: 4, id: conversationId },
  notificationType: 'conversation_mention',
});

const mountList = ({
  list = [],
  params = {},
  name = 'inbox_view',
  flags = {},
  settings = {},
} = {}) => {
  env.route = reactive({ name, params });
  env.router = { push: vi.fn(), replace: vi.fn() };
  env.uiSettings = computed(() => settings);
  env.records = vi.fn(() => list);
  env.getters = reactive({
    'notifications/getMeta': { unreadCount: 3, count: 9 },
    'notifications/getUIFlags': {
      isFetching: false,
      isAllNotificationsLoaded: false,
      ...flags,
    },
    'notifications/getFilteredNotificationsV4': filters => env.records(filters),
    'inboxes/getInboxById': id => ({ id, name: `Inbox ${id}` }),
  });
  env.store = { dispatch: vi.fn() };
  return mount(InboxList, {
    attachTo: document.body,
    global: {
      stubs: {
        InboxCard: Card,
        InboxListHeader: Header,
        IntersectionObserver: Observer,
        CmdBarConversationSnooze: true,
        Spinner: true,
        RouterView: true,
      },
      mocks: { $t: key => key },
    },
  });
};

const calls = action =>
  env.store.dispatch.mock.calls
    .filter(([name]) => name === action)
    .map(([, payload]) => payload);

describe('InboxList behaviour', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('restores saved filters and fetches the first page', async () => {
    mountList({
      settings: {
        inbox_filter_by: { status: 'read', type: 'mention', sort_by: 'asc' },
      },
    });
    await flushPromises();
    const filters = {
      page: 1,
      status: 'read',
      type: 'mention',
      sortOrder: 'asc',
    };
    expect(calls('notifications/setNotificationFilters')).toEqual([filters]);
    expect(env.store.dispatch).toHaveBeenCalledWith('notifications/clear');
    expect(calls('notifications/index')).toEqual([filters]);

    env.store.dispatch.mockClear();
    mountList();
    await flushPromises();
    expect(calls('notifications/index')).toEqual([
      { page: 1, status: undefined, type: undefined, sortOrder: 'desc' },
    ]);
  });

  it('applies filter changes and pages through results', async () => {
    const wrapper = mountList({ list: [notification(1, 10)] });
    await flushPromises();
    const header = wrapper.findComponent(Header);
    env.store.dispatch.mockClear();
    await header.vm.$emit('filter', {
      type: 'status',
      key: 'snoozed',
      selected: true,
    });
    await header.vm.$emit('filter', {
      type: 'type',
      key: 'mention',
      selected: true,
    });
    await header.vm.$emit('filter', { type: 'sort_order', key: 'asc' });
    await header.vm.$emit('filter', {
      type: 'status',
      key: 'snoozed',
      selected: false,
    });
    await header.vm.$emit('filter', {
      type: 'type',
      key: 'mention',
      selected: false,
    });
    await flushPromises();
    expect(calls('notifications/index').at(-1)).toEqual({
      page: 1,
      status: '',
      type: '',
      sortOrder: 'asc',
    });
    expect(
      calls('notifications/updateNotificationFilters').length
    ).toBeGreaterThan(0);

    const observer = wrapper.findComponent(Observer);
    expect(observer.props('options').rootMargin).toBe('100px 0px 100px 0px');
    await observer.vm.$emit('observed');
    expect(calls('notifications/index').at(-1)).toEqual({
      page: 2,
      status: '',
      type: '',
      sortOrder: 'asc',
    });

    env.getters['notifications/getUIFlags'] = {
      isFetching: false,
      isAllNotificationsLoaded: true,
    };
    await flushPromises();
    expect(wrapper.findComponent(Observer).exists()).toBe(false);
    wrapper.vm.$.setupState.loadMoreNotifications();
    expect(calls('notifications/index').at(-1).page).toBe(2);
  });

  it('shows loading, empty and end-of-list states', async () => {
    let wrapper = mountList({ flags: { isFetching: true } });
    expect(wrapper.find('spinner-stub').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('INBOX.LIST.NO_NOTIFICATIONS');
    expect(wrapper.findComponent(Observer).exists()).toBe(false);

    wrapper = mountList();
    expect(wrapper.text()).toContain('INBOX.LIST.NO_NOTIFICATIONS');
    expect(wrapper.find('spinner-stub').exists()).toBe(false);
  });

  it('highlights and scrolls to the open conversation', async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const wrapper = mountList({
      list: [
        notification(1, 10),
        { ...notification(2, 20), primaryActor: undefined },
      ],
      params: { id: '10' },
    });
    await flushPromises();
    const cards = wrapper.findAll('.card');
    expect(cards[0].classes()).toContain('active');
    expect(cards[1].classes()).not.toContain('active');
    expect(wrapper.findAllComponents(Card)[0].props('stateInbox')).toEqual({
      id: 4,
      name: 'Inbox 4',
    });
    expect(scroll).toHaveBeenCalledWith({
      block: 'center',
      behavior: 'smooth',
    });
    expect(wrapper.find('section > div').classes()).toContain('hidden');

    scroll.mockClear();
    env.route.params = { id: '99' };
    await flushPromises();
    expect(scroll).not.toHaveBeenCalled();
    expect(mountList().find('section > div').classes()).toContain('flex');
  });

  it('marks notifications read and unread, and deletes them', async () => {
    const wrapper = mountList({
      list: [notification(1, 10)],
      name: 'inbox_view_conversation',
    });
    const card = wrapper.findComponent(Card);
    const item = notification(1, 10);

    await card.vm.$emit('markNotificationAsRead', item);
    await flushPromises();
    expect(calls('notifications/read')).toEqual([
      {
        id: 1,
        primaryActorId: 10,
        primaryActorType: 'Conversation',
        unreadCount: 3,
      },
    ]);
    expect(useAlert).toHaveBeenCalledWith('INBOX.ALERTS.MARK_AS_READ');
    expect(useTrack).toHaveBeenCalled();

    await card.vm.$emit('markNotificationAsUnRead', item);
    await flushPromises();
    expect(calls('notifications/unread')).toEqual([{ id: 1 }]);
    expect(useAlert).toHaveBeenCalledWith('INBOX.ALERTS.MARK_AS_UNREAD');
    expect(env.router.replace).toHaveBeenCalledWith({ name: 'inbox_view' });

    await card.vm.$emit('deleteNotification', item);
    await flushPromises();
    expect(calls('notifications/delete')).toEqual([
      { notification: item, unread_count: 3, count: 9 },
    ]);
    expect(useAlert).toHaveBeenCalledWith('INBOX.ALERTS.DELETE');

    useAlert.mockClear();
    env.store.dispatch.mockRejectedValue(new Error('down'));
    await card.vm.$emit('markNotificationAsRead', item);
    await card.vm.$emit('markNotificationAsUnRead', item);
    await card.vm.$emit('deleteNotification', item);
    await flushPromises();
    expect(useAlert).not.toHaveBeenCalled();
  });

  it('does not redirect when already on the inbox', async () => {
    const wrapper = mountList({ list: [notification(1, 10)] });
    await wrapper.findComponent(Header).vm.$emit('redirect');
    expect(env.router.replace).not.toHaveBeenCalled();
  });

  it('opens a conversation from a card', async () => {
    const wrapper = mountList({
      list: [notification(1, 10)],
      params: { id: '10' },
    });
    await wrapper.find('.card').trigger('click');
    await flushPromises();
    expect(calls('notifications/read')).toEqual([]);

    env.route.params = {};
    await wrapper.find('.card').trigger('click');
    await flushPromises();
    expect(calls('notifications/read')).toHaveLength(1);
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'notifications/unReadCount'
    );
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'inbox_view_conversation',
      params: { inboxId: 4, type: 'conversation', id: 10 },
    });

    env.router.push.mockClear();
    env.store.dispatch.mockRejectedValue(new Error('down'));
    await wrapper.find('.card').trigger('click');
    await flushPromises();
    expect(env.router.push).not.toHaveBeenCalled();
  });

  it('tracks the card context menu for the header', async () => {
    const wrapper = mountList({ list: [notification(1, 10)] });
    await wrapper.findComponent(Card).vm.$emit('contextMenuOpen');
    expect(wrapper.findComponent(Header).props('isContextMenuOpen')).toBe(true);
    await wrapper.findComponent(Card).vm.$emit('contextMenuClose');
    expect(wrapper.findComponent(Header).props('isContextMenuOpen')).toBe(
      false
    );
  });
});
