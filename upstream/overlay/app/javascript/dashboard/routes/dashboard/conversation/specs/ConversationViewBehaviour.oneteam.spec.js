/**
 * OneTeam behaviour spec for the main conversations screen.
 *
 * Covers clearing stale selection on create and on leaving the route,
 * loading agents and portals, the active inbox, selecting the routed
 * conversation (skipping missing or already active ones, scrolling to a
 * linked message), refetching a conversation that is not in the list,
 * reacting to route and list changes, list/message/sidebar visibility in
 * condensed and expanded layouts, toggling the layout and the search flag.
 */
import { computed, nextTick, reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import ConversationView from '../ConversationView.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.uiSettings,
    updateUISettings: (...args) => env.updateUISettings(...args),
    isOnExpandedLayout: computed(() => env.expanded.value),
  }),
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { ref: vueRef } = await import('vue');
  return { useAccount: () => ({ accountId: vueRef(1) }) };
});
vi.mock(
  'dashboard/composables/useContactConversationNavigation',
  async importOriginal => ({
    ...(await importOriginal()),
    useContactConversationNavigation: () => ({}),
  })
);

const stub = (name, props = [], emits = []) => ({
  name,
  props,
  emits,
  template: `<div class="${name}"><slot /></div>`,
});
const ChatList = stub(
  'ChatList',
  ['showConversationList', 'isOnExpandedLayout'],
  ['conversationLoad']
);

const mountView = async (props = {}) => {
  const wrapper = mount(ConversationView, {
    props,
    global: {
      mocks: { $store: env.store, $route: env.route },
      stubs: {
        ChatList,
        ConversationBox: stub('ConversationBox'),
        SidepanelSwitch: stub('SidepanelSwitch'),
        ConversationSidebar: stub('ConversationSidebar', ['currentChat']),
        CmdBarConversationSnooze: stub('CmdBarConversationSnooze'),
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const actions = () => env.dispatch.mock.calls.map(([name]) => name);

describe('Conversation view behaviour', () => {
  beforeEach(() => {
    env.uiSettings = ref({ is_contact_sidebar_open: true });
    env.updateUISettings = vi.fn();
    env.expanded = ref(false);
    env.dispatch = vi.fn().mockResolvedValue();
    env.route = { query: { messageId: '55' } };
    env.store = reactive({
      state: { route: { path: '/a' } },
      getters: {
        getAllConversations: [{ id: 7 }, { id: 8 }],
        getSelectedChat: {},
      },
      dispatch: (...args) => env.dispatch(...args),
    });
    vi.spyOn(emitter, 'emit');
  });

  it('clears the selection and loads data without a conversation', async () => {
    const wrapper = await mountView({ inboxId: 3 });
    expect(actions()).toEqual([
      'clearSelectedState',
      'agents/get',
      'portals/index',
      'setActiveInbox',
      'clearSelectedState',
    ]);
    expect(env.dispatch).toHaveBeenCalledWith('setActiveInbox', 3);
    expect(wrapper.findComponent(ChatList).props('showConversationList')).toBe(
      true
    );
    expect(wrapper.find('.ConversationBox').exists()).toBe(true);
    expect(wrapper.find('.SidepanelSwitch').exists()).toBe(false);
    expect(wrapper.find('.ConversationSidebar').exists()).toBe(false);
  });

  it('selects the routed conversation and scrolls to the linked message', async () => {
    await mountView({ conversationId: '8' });
    expect(env.dispatch).toHaveBeenCalledWith('setActiveChat', {
      data: { id: 8 },
      after: '55',
    });
    expect(emitter.emit).toHaveBeenCalledWith(BUS_EVENTS.SCROLL_TO_MESSAGE, {
      messageId: '55',
    });
  });

  it('skips missing and already active conversations', async () => {
    env.store.getters.getSelectedChat = { id: 7 };
    const wrapper = await mountView({ conversationId: 7 });
    expect(actions()).not.toContain('setActiveChat');
    await wrapper.setProps({ conversationId: 99 });
    expect(env.dispatch).toHaveBeenLastCalledWith('getConversation', 99);
    await wrapper.findComponent(ChatList).vm.$emit('conversationLoad');
    expect(actions().filter(a => a === 'getConversation')).toHaveLength(2);
    await wrapper.setProps({ conversationId: 8 });
    expect(actions().filter(a => a === 'getConversation')).toHaveLength(2);
    await wrapper.setProps({ conversationId: 0 });
    expect(actions().filter(a => a === 'getConversation')).toHaveLength(2);
  });

  it('reinitializes on route changes and when the list grows', async () => {
    await mountView({ conversationId: 9 });
    env.dispatch.mockClear();
    env.store.state.route = { path: '/b' };
    await nextTick();
    expect(actions()).toEqual(['setActiveInbox']);
    env.store.getters.getAllConversations = [{ id: 7 }, { id: 8 }, { id: 9 }];
    await flushPromises();
    expect(env.dispatch).toHaveBeenLastCalledWith('setActiveChat', {
      data: { id: 9 },
      after: '55',
    });
  });

  it('shows the sidebar for an open conversation when enabled', async () => {
    env.store.getters.getSelectedChat = { id: 7 };
    const wrapper = await mountView({ conversationId: 7 });
    expect(wrapper.find('.SidepanelSwitch').exists()).toBe(true);
    expect(
      wrapper
        .findComponent({ name: 'ConversationSidebar' })
        .props('currentChat')
    ).toEqual({ id: 7 });
    env.uiSettings.value = { is_contact_sidebar_open: false };
    await nextTick();
    expect(wrapper.find('.ConversationSidebar').exists()).toBe(false);
  });

  it('switches between list and conversation in the expanded layout', async () => {
    env.expanded.value = true;
    const wrapper = await mountView();
    expect(wrapper.findComponent(ChatList).props('showConversationList')).toBe(
      true
    );
    expect(wrapper.find('.ConversationBox').exists()).toBe(false);
    await wrapper.setProps({ conversationId: 7 });
    expect(wrapper.findComponent(ChatList).props('showConversationList')).toBe(
      false
    );
    expect(wrapper.find('.ConversationBox').exists()).toBe(true);
  });

  it('toggles the layout type', async () => {
    const wrapper = await mountView();
    wrapper.vm.toggleConversationLayout();
    expect(env.updateUISettings).toHaveBeenLastCalledWith({
      conversation_display_type: 'expanded',
      previously_used_conversation_display_type: 'expanded',
    });
    env.uiSettings.value = { conversation_display_type: 'expanded' };
    wrapper.vm.toggleConversationLayout();
    expect(env.updateUISettings).toHaveBeenLastCalledWith({
      conversation_display_type: 'condensed',
      previously_used_conversation_display_type: 'condensed',
    });
  });

  it('tracks the search modal flag', async () => {
    const wrapper = await mountView();
    wrapper.vm.onSearch();
    expect(wrapper.vm.showSearchModal).toBe(true);
    wrapper.vm.closeSearch();
    expect(wrapper.vm.showSearchModal).toBe(false);
  });

  it('clears the selection when leaving an open conversation', async () => {
    const leave = ConversationView.beforeRouteLeave;
    const next = vi.fn();
    const store = { dispatch: vi.fn() };
    leave.call({ conversationId: 7, $store: store }, {}, {}, next);
    expect(store.dispatch).toHaveBeenCalledWith('clearSelectedState');
    leave.call({ conversationId: 0, $store: store }, {}, {}, next);
    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
