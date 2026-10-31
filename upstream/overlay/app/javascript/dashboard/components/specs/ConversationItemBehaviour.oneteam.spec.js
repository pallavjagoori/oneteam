/**
 * OneTeam behaviour spec for a conversation row in the list.
 *
 * Covers both layouts (condensed and expanded), the card props derived
 * from the store, opening a conversation (normal, new tab, already open,
 * no path), selection, the context menu (open, close, reset when the
 * row is recycled) and every context-menu action.
 */
import { computed, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import ConversationItem from '../ConversationItem.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.getters[name]),
}));
vi.mock('dashboard/helper/URLHelper', () => ({
  frontendURL: path => (path ? `/app/${path}` : ''),
  conversationUrl: ({ id }) => (env.noPath ? '' : `conversations/${id}`),
}));

const cardProps = [
  'chat',
  'currentContact',
  'assignee',
  'inbox',
  'selected',
  'isActiveChat',
  'showAssignee',
  'showInboxName',
  'isInboxView',
];
const Card = {
  name: 'ConversationCard',
  props: cardProps,
  emits: ['click', 'contextmenu', 'selectConversation', 'deSelectConversation'],
  template: '<div class="card" />',
};
const Expanded = {
  ...Card,
  name: 'ConversationCardExpanded',
  template: '<div class="expanded" />',
};
const Menu = {
  name: 'ContextMenu',
  props: ['x', 'y'],
  emits: ['close'],
  template: '<div class="menu"><slot /></div>',
};
const Actions = {
  name: 'ConversationContextMenu',
  props: [
    'status',
    'inboxId',
    'priority',
    'chatId',
    'hasUnreadMessages',
    'conversationLabels',
    'conversationUrl',
  ],
  template: '<ul />',
};

const injected = () =>
  Object.fromEntries(
    [
      'selectConversation',
      'deSelectConversation',
      'assignAgent',
      'assignTeam',
      'assignLabels',
      'removeLabels',
      'updateConversationStatus',
      'toggleContextMenu',
      'markAsUnread',
      'markAsRead',
      'assignPriority',
      'deleteConversation',
    ].map(key => [key, vi.fn()])
  );

const source = (extra = {}) => ({
  id: 7,
  inbox_id: 2,
  status: 'open',
  priority: 'high',
  unread_count: 2,
  labels: ['vip'],
  meta: { assignee: { id: 9 }, sender: { id: 4 } },
  ...extra,
});

const mountItem = (props = {}, getters = {}) => {
  env.router = { push: vi.fn() };
  env.store = {
    getters: {
      'contacts/getContact': id => ({ id, name: 'Jane' }),
      'inboxes/getInbox': id => ({ id, name: 'Web' }),
    },
  };
  env.getters = reactive({
    getSelectedChat: { id: 1 },
    'inboxes/getInboxes': [{}, {}],
    getSelectedInbox: undefined,
    getCurrentAccountId: 1,
    ...getters,
  });
  env.provide = { ...injected(), isConversationSelected: id => id === 7 };
  return mount(ConversationItem, {
    props: { source: source(), ...props },
    global: {
      provide: env.provide,
      stubs: {
        ConversationCard: Card,
        ConversationCardExpanded: Expanded,
        ContextMenu: Menu,
        ConversationContextMenu: Actions,
      },
    },
  });
};

const openMenu = async (
  wrapper,
  card = Card,
  event = { pageX: 10, pageY: 20 }
) => {
  await wrapper
    .findComponent(card)
    .vm.$emit('contextmenu', { preventDefault: vi.fn(), ...event });
};

describe('ConversationItem behaviour', () => {
  beforeEach(() => {
    env.noPath = false;
    window.chatwootConfig = { hostURL: 'https://chat.example' };
    window.open = vi.fn();
  });

  it('renders the condensed card with store-derived props', async () => {
    const wrapper = mountItem({ showAssignee: true });
    expect(wrapper.findComponent(Card).props()).toMatchObject({
      currentContact: { id: 4, name: 'Jane' },
      assignee: { id: 9 },
      inbox: { id: 2, name: 'Web' },
      selected: true,
      isActiveChat: false,
      showAssignee: true,
      showInboxName: true,
    });
    await wrapper.findComponent(Card).vm.$emit('selectConversation', 7, 2);
    await wrapper.findComponent(Card).vm.$emit('deSelectConversation', 7, 2);
    expect(env.provide.selectConversation).toHaveBeenCalledWith(7, 2);
    expect(env.provide.deSelectConversation).toHaveBeenCalledWith(7, 2);
  });

  it('handles rows without metadata, sender or inbox', () => {
    const wrapper = mountItem(
      { source: { id: 8 } },
      { getSelectedInbox: 2, 'inboxes/getInboxes': [{}] }
    );
    expect(wrapper.findComponent(Card).props()).toMatchObject({
      currentContact: {},
      assignee: {},
      inbox: {},
      selected: false,
      showInboxName: false,
    });
    const other = mountItem(
      { source: { id: 8, meta: { sender: {} } } },
      { 'inboxes/getInboxes': [{}] }
    );
    expect(other.findComponent(Card).props('currentContact')).toEqual({});
    expect(other.findComponent(Card).props('showInboxName')).toBe(false);
  });

  it('renders the expanded card and maps its checkbox to selection', async () => {
    const wrapper = mountItem({ showExpanded: true }, { getSelectedInbox: 2 });
    const card = wrapper.findComponent(Expanded);
    expect(card.props()).toMatchObject({
      showAssignee: true,
      isInboxView: true,
      showInboxName: false,
    });
    await card.vm.$emit('selectConversation', true);
    expect(env.provide.selectConversation).toHaveBeenCalledWith(7, 2);
    await card.vm.$emit('deSelectConversation', false);
    expect(env.provide.deSelectConversation).toHaveBeenCalledWith(7, 2);
    expect(
      mountItem({ showExpanded: true })
        .findComponent(Expanded)
        .props('isInboxView')
    ).toBe(false);
  });

  it('opens conversations in place or in a new tab', async () => {
    const wrapper = mountItem();
    const click = event =>
      wrapper
        .findComponent(Card)
        .vm.$emit('click', { preventDefault: vi.fn(), ...event });
    await click({});
    expect(env.router.push).toHaveBeenCalledWith({
      path: '/app/conversations/7',
    });
    await click({ metaKey: true });
    await click({ ctrlKey: true });
    expect(window.open).toHaveBeenCalledWith(
      'https://chat.example/app/conversations/7',
      '_blank',
      'noopener,noreferrer'
    );
    expect(window.open).toHaveBeenCalledTimes(2);

    env.getters.getSelectedChat = { id: 7 };
    env.router.push.mockClear();
    await click({});
    expect(env.router.push).not.toHaveBeenCalled();

    env.noPath = true;
    const noPath = mountItem();
    await noPath.findComponent(Card).vm.$emit('click', {});
    expect(env.router.push).not.toHaveBeenCalled();
  });

  it('opens and closes the context menu', async () => {
    const wrapper = mountItem();
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
    await openMenu(wrapper);
    expect(env.provide.toggleContextMenu).toHaveBeenCalledWith(true);
    expect(wrapper.findComponent(Menu).props()).toEqual({ x: 10, y: 20 });
    expect(wrapper.findComponent(Actions).props()).toMatchObject({
      status: 'open',
      inboxId: 2,
      priority: 'high',
      chatId: 7,
      hasUnreadMessages: true,
      conversationLabels: ['vip'],
      conversationUrl: '/app/conversations/7',
    });
    await wrapper.findComponent(Menu).vm.$emit('close');
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
    expect(env.provide.toggleContextMenu).toHaveBeenLastCalledWith(false);

    await openMenu(wrapper, Card, { clientX: 1, clientY: 2 });
    expect(wrapper.findComponent(Menu).props()).toEqual({ x: 1, y: 2 });
    await wrapper.findComponent(Actions).vm.$emit('close');
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
  });

  it('resets the menu when the row shows a different conversation', async () => {
    const wrapper = mountItem({ showExpanded: true });
    await openMenu(wrapper, Expanded);
    env.provide.toggleContextMenu.mockClear();
    await wrapper.setProps({ source: source({ id: 8 }) });
    expect(env.provide.toggleContextMenu).toHaveBeenCalledWith(false);
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
    env.provide.toggleContextMenu.mockClear();
    await wrapper.setProps({ source: source({ id: 9 }) });
    expect(env.provide.toggleContextMenu).not.toHaveBeenCalled();
  });

  it('runs every context-menu action', async () => {
    const wrapper = mountItem();
    const act = async (event, ...args) => {
      await openMenu(wrapper);
      await wrapper.findComponent(Actions).vm.$emit(event, ...args);
    };
    await act('updateConversation', 'snoozed', 123);
    expect(env.provide.updateConversationStatus).toHaveBeenCalledWith(
      7,
      'snoozed',
      123
    );
    await act('assignAgent', { id: 3 });
    expect(env.provide.assignAgent).toHaveBeenCalledWith({ id: 3 }, [7]);
    await act('assignLabel', { title: 'bug' });
    expect(env.provide.assignLabels).toHaveBeenCalledWith(['bug'], [7]);
    await act('removeLabel', { title: 'bug' });
    expect(env.provide.removeLabels).toHaveBeenCalledWith(['bug'], [7]);
    await act('assignTeam', { id: 5 });
    expect(env.provide.assignTeam).toHaveBeenCalledWith({ id: 5 }, 7);
    await act('markAsUnread');
    expect(env.provide.markAsUnread).toHaveBeenCalledWith(7);
    await act('markAsRead');
    expect(env.provide.markAsRead).toHaveBeenCalledWith(7);
    await act('assignPriority', 'low');
    expect(env.provide.assignPriority).toHaveBeenCalledWith('low', 7);
    await act('deleteConversation');
    expect(env.provide.deleteConversation).toHaveBeenCalledWith(7);
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
  });
});
