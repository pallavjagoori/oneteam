/**
 * OneTeam behaviour spec for the widget's message list.
 *
 * Covers the light and dark colour scheme, the loading spinner, date
 * groups with their messages, the typing bubble (agent typing, or a
 * pending conversation whose last message came from the visitor),
 * scrolling to the bottom on mount and when new messages arrive, and
 * loading older messages when scrolled near the top (but not while
 * loading, once everything is loaded, or for an empty conversation).
 */
import { mount } from '@vue/test-utils';
import { reactive, ref } from 'vue';
import { createStore } from 'vuex';
import ConversationWrap from '../ConversationWrap.vue';

const env = vi.hoisted(() => ({ darkMode: null }));

vi.mock('widget/composables/useDarkMode', () => ({
  useDarkMode: () => ({ darkMode: env.darkMode }),
}));

let state;
let fetchOld;
const makeStore = () => {
  fetchOld = vi.fn();
  return createStore({
    modules: {
      conversation: {
        namespaced: true,
        getters: {
          getEarliestMessage: () => ({ id: 41 }),
          getLastMessage: () => state.lastMessage,
          getAllMessagesLoaded: () => state.allLoaded,
          getIsFetchingList: () => state.fetching,
          getConversationSize: () => state.size,
          getIsAgentTyping: () => state.typing,
        },
        actions: { fetchOldConversations: (_, payload) => fetchOld(payload) },
      },
      conversationAttributes: {
        namespaced: true,
        getters: { getConversationParams: () => ({ status: state.status }) },
      },
    },
  });
};

const mountWrap = groupedMessages =>
  mount(ConversationWrap, {
    props: { groupedMessages },
    global: {
      plugins: [makeStore()],
      stubs: {
        ChatMessage: {
          props: ['message'],
          template: '<p>{{ message.id }}</p>',
        },
        DateSeparator: { props: ['date'], template: '<h4>{{ date }}</h4>' },
        AgentTypingBubble: { template: '<i class="typing" />' },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

const scrollable = (wrapper, { top, height }) => {
  Object.defineProperty(wrapper.element, 'scrollHeight', {
    configurable: true,
    get: () => height,
  });
  wrapper.element.scrollTop = top;
};

describe('ConversationWrap behaviour', () => {
  beforeEach(() => {
    env.darkMode = ref('light');
    state = reactive({
      lastMessage: { message_type: 1 },
      allLoaded: false,
      fetching: false,
      size: 2,
      typing: false,
      status: 'open',
    });
  });

  it('renders the scheme, spinner and date groups', () => {
    const wrapper = mountWrap([
      { date: 'Today', messages: [{ id: 1 }, { id: 2 }] },
    ]);
    expect(wrapper.classes()).toContain('light-scheme');
    expect(wrapper.find('h4').text()).toBe('Today');
    expect(wrapper.findAll('p').map(p => p.text())).toEqual(['1', '2']);
    expect(wrapper.find('.spinner').exists()).toBe(false);
    expect(mountWrap(undefined).findAll('h4')).toHaveLength(0);

    env.darkMode = ref('dark');
    state.fetching = true;
    const dark = mountWrap([]);
    expect(dark.classes()).toContain('dark-scheme');
    expect(dark.find('.spinner').exists()).toBe(true);
  });

  it('shows the typing bubble when an agent types or a reply is pending', async () => {
    const wrapper = mountWrap([]);
    expect(wrapper.find('.typing').exists()).toBe(false);
    state.typing = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.is-typing').exists()).toBe(true);
    expect(wrapper.find('.typing').exists()).toBe(true);

    state.typing = false;
    state.status = 'pending';
    state.lastMessage = { message_type: 0 };
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.typing').exists()).toBe(true);
    state.lastMessage = { message_type: 1 };
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.typing').exists()).toBe(false);
  });

  it('loads older messages near the top and keeps the position', async () => {
    const wrapper = mountWrap([]);
    scrollable(wrapper, { top: 50, height: 900 });
    wrapper.element.dispatchEvent(new Event('scroll'));
    expect(fetchOld).toHaveBeenCalledWith({ before: 41 });
    expect(wrapper.vm.previousScrollHeight).toBe(900);

    // New messages arrive: scroll down by the height that was added.
    scrollable(wrapper, { top: 50, height: 1500 });
    state.size = 5;
    await wrapper.setProps({
      groupedMessages: [{ date: 'Yesterday', messages: [{ id: 3 }] }],
    });
    expect(wrapper.element.scrollTop).toBe(600);

    // A re-render without new messages leaves the position alone.
    wrapper.element.scrollTop = 10;
    await wrapper.setProps({ groupedMessages: [] });
    expect(wrapper.element.scrollTop).toBe(10);
    expect(wrapper.vm.previousScrollHeight).toBe(0);

    // Further down the list, nothing is fetched.
    scrollable(wrapper, { top: 400, height: 1500 });
    wrapper.element.dispatchEvent(new Event('scroll'));
    expect(fetchOld).toHaveBeenCalledTimes(1);
  });

  it('skips loading while fetching, when all loaded or empty', async () => {
    const wrapper = mountWrap([]);
    scrollable(wrapper, { top: 0, height: 900 });
    const scroll = () => wrapper.element.dispatchEvent(new Event('scroll'));

    state.fetching = true;
    scroll();
    state.fetching = false;
    state.size = 0;
    scroll();
    state.size = 2;
    wrapper.vm.previousScrollHeight = 300;
    state.allLoaded = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.previousScrollHeight).toBe(0);
    scroll();
    expect(fetchOld).not.toHaveBeenCalled();

    const remove = vi.spyOn(wrapper.element, 'removeEventListener');
    wrapper.unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
