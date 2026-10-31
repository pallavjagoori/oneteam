/**
 * OneTeam behaviour spec for the contact's previous conversations panel.
 *
 * Covers fetching on mount and when the contact changes, the spinner,
 * the empty state, listing other conversations (contact, assignee and
 * inbox fallbacks, active chat, inbox names when several inboxes are
 * visible), opening a conversation (same tab, new tab with Ctrl/Cmd, no
 * path), and the right-click context menu (position, close).
 */
import { flushPromises, mount } from '@vue/test-utils';
import { computed, reactive } from 'vue';
import ContactConversations from '../ContactConversations.vue';

const { env, Card, Menu, ChatMenu } = vi.hoisted(() => ({
  env: {},
  Card: {
    name: 'ConversationCard',
    props: [
      'chat',
      'currentContact',
      'assignee',
      'inbox',
      'isActiveChat',
      'showInboxName',
    ],
    emits: ['click', 'contextmenu'],
    template: '<div class="card" />',
  },
  Menu: {
    name: 'ContextMenu',
    props: ['x', 'y'],
    emits: ['close'],
    template: '<div class="menu"><slot /></div>',
  },
  ChatMenu: {
    name: 'ConversationContextMenu',
    props: ['chatId', 'hasUnreadMessages', 'conversationUrl', 'allowedOptions'],
    emits: ['close'],
    template: '<div class="chat-menu" />',
  },
}));

vi.mock(
  'dashboard/components/widgets/conversation/ConversationCard.vue',
  () => ({
    default: Card,
  })
);
vi.mock('dashboard/components/ui/ContextMenu.vue', () => ({ default: Menu }));
vi.mock(
  'dashboard/components/widgets/conversation/contextMenu/Index.vue',
  () => ({ default: ChatMenu })
);
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.state[name]),
}));
vi.mock('vue-router', () => ({ useRouter: () => env.router }));
vi.mock('dashboard/composables/useConversationRoutePath', () => ({
  useConversationRoutePath: () => ({
    buildConversationPath: id =>
      id === 99 ? '' : `/app/accounts/1/conversations/${id}`,
  }),
}));

const conversations = [
  {
    id: 5,
    inbox_id: 1,
    meta: { sender: { id: 7 }, assignee: { id: 2 } },
    unread_count: 2,
    status: 'open',
  },
  { id: 6, inbox_id: 2, unread_count: 0 },
  { id: 9 },
  { id: 99 },
];

const mountPanel = async ({
  isFetching = false,
  list = conversations,
  activeInbox = null,
  inboxes = [{}, {}],
} = {}) => {
  env.store = { dispatch: vi.fn() };
  env.router = { push: vi.fn() };
  env.state = reactive({
    getSelectedChat: { id: 6 },
    'contactConversations/getUIFlags': { isFetching },
    'contacts/getContact': id =>
      id === 7 ? { id: 7, name: 'Ann' } : undefined,
    'inboxes/getInbox': id => (id === 1 ? { id: 1, name: 'Email' } : undefined),
    getSelectedInbox: activeInbox,
    'inboxes/getInboxes': inboxes,
    'contactConversations/getContactConversation': () => list,
  });
  const wrapper = mount(ContactConversations, {
    props: { contactId: 3, conversationId: '9' },
    global: {
      stubs: { Spinner: { template: '<i class="spin" />' } },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};
const cards = wrapper => wrapper.findAllComponents(Card);
const event = extra => ({ preventDefault: vi.fn(), ...extra });

afterEach(() => {
  delete window.chatwootConfig;
});

describe('ContactConversations behaviour', () => {
  it('fetches conversations and shows a spinner while loading', async () => {
    const wrapper = await mountPanel({ isFetching: true });
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'contactConversations/get',
      3
    );
    expect(wrapper.find('.spin').exists()).toBe(true);
  });

  it('shows the empty state when only the current conversation exists', async () => {
    const wrapper = await mountPanel({ list: [{ id: 9 }] });
    expect(wrapper.text()).toContain(
      'CONTACT_PANEL.CONVERSATIONS.NO_RECORDS_FOUND'
    );
  });

  it('lists other conversations with fallbacks', async () => {
    const wrapper = await mountPanel();
    const [first, second] = cards(wrapper);
    expect(cards(wrapper).map(c => c.props('chat').id)).toEqual([5, 6, 99]);
    expect(first.props()).toMatchObject({
      currentContact: { id: 7, name: 'Ann' },
      assignee: { id: 2 },
      inbox: { id: 1, name: 'Email' },
      isActiveChat: false,
      showInboxName: true,
    });
    expect(second.props()).toMatchObject({
      currentContact: {},
      assignee: {},
      inbox: {},
      isActiveChat: true,
    });
  });

  it('hides inbox names inside an inbox or with one inbox', async () => {
    const inInbox = await mountPanel({ activeInbox: 1 });
    expect(cards(inInbox)[0].props('showInboxName')).toBe(false);
    const single = await mountPanel({ inboxes: [{}] });
    expect(cards(single)[0].props('showInboxName')).toBe(false);
  });

  it('opens conversations in the same tab or a new one', async () => {
    window.chatwootConfig = { hostURL: 'https://chat.example.com' };
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = await mountPanel();
    const [first, second, missing] = cards(wrapper);
    first.vm.$emit('click', event());
    expect(env.router.push).toHaveBeenCalledWith({
      path: '/app/accounts/1/conversations/5',
    });
    const metaClick = event({ metaKey: true });
    second.vm.$emit('click', metaClick);
    expect(metaClick.preventDefault).toHaveBeenCalled();
    second.vm.$emit('click', event({ ctrlKey: true }));
    expect(open).toHaveBeenCalledWith(
      'https://chat.example.com/app/accounts/1/conversations/6',
      '_blank',
      'noopener,noreferrer'
    );
    expect(open).toHaveBeenCalledTimes(2);
    missing.vm.$emit('click', event());
    expect(env.router.push).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });

  it('opens and closes the context menu', async () => {
    const wrapper = await mountPanel();
    cards(wrapper)[0].vm.$emit('contextmenu', event({ pageX: 10, pageY: 20 }));
    await flushPromises();
    expect(wrapper.findComponent(Menu).props()).toEqual({ x: 10, y: 20 });
    expect(wrapper.findComponent(ChatMenu).props()).toMatchObject({
      chatId: 5,
      hasUnreadMessages: true,
      conversationUrl: '/app/accounts/1/conversations/5',
      allowedOptions: ['open-new-tab', 'copy-link'],
    });
    wrapper.findComponent(ChatMenu).vm.$emit('close');
    await flushPromises();
    expect(wrapper.findComponent(Menu).exists()).toBe(false);

    cards(wrapper)[1].vm.$emit(
      'contextmenu',
      event({ clientX: 3, clientY: 4 })
    );
    await flushPromises();
    expect(wrapper.findComponent(Menu).props()).toEqual({ x: 3, y: 4 });
    expect(wrapper.findComponent(ChatMenu).props('hasUnreadMessages')).toBe(
      false
    );
    wrapper.findComponent(Menu).vm.$emit('close');
    await flushPromises();
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
    expect(wrapper.vm.$.setupState.conversationPath).toBe('');
  });

  it('refetches and closes the menu when the contact changes', async () => {
    const wrapper = await mountPanel();
    cards(wrapper)[0].vm.$emit('contextmenu', event({ pageX: 1, pageY: 1 }));
    await flushPromises();
    await wrapper.setProps({ contactId: 4 });
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenLastCalledWith(
      'contactConversations/get',
      4
    );
    expect(wrapper.findComponent(Menu).exists()).toBe(false);
    await wrapper.setProps({ contactId: '' });
    expect(env.store.dispatch).toHaveBeenCalledTimes(2);
  });
});
