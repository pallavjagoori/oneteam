/**
 * OneTeam behaviour spec for the reply box "assign to me" banner.
 *
 * Complements the upstream bot-handoff spec: showing the self-assign
 * banner only when typing a reply to someone else's conversation,
 * assigning it to yourself (with success and failure toasts), and the
 * fallback bot name in the handoff banner.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { computed } from 'vue';
import ConversationApi from 'dashboard/api/inbox/conversation';
import { useAlert } from 'dashboard/composables';
import ReplyBoxBanner from '../ReplyBoxBanner.vue';

const env = vi.hoisted(() => ({ chat: null, dispatch: vi.fn() }));

vi.mock('dashboard/api/inbox/conversation', () => ({
  default: { assignAgent: vi.fn() },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));
vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({ dispatch: env.dispatch, commit: vi.fn() }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: key =>
    key === 'getSelectedChat'
      ? computed(() => env.chat)
      : computed(() => ({ id: 7 })),
}));

const Banner = {
  name: 'Banner',
  props: ['bannerMessage'],
  emits: ['primaryAction'],
  template: '<div class="banner" />',
};

/**
 * Mounts the banner for a chat and draft message.
 *
 * @param {object} chat Selected conversation.
 * @param {object} props Banner props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBanner = (chat, props = { message: 'Hi' }) => {
  env.chat = chat;
  return mount(ReplyBoxBanner, {
    props,
    global: {
      stubs: { Banner },
      mocks: {
        $t: (key, args) => (args ? `${key}:${args.assigneeName}` : key),
      },
    },
  });
};

describe('ReplyBoxBanner self-assign behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn();
    ConversationApi.assignAgent.mockReset();
  });

  it('assigns the conversation to the current agent', async () => {
    ConversationApi.assignAgent.mockResolvedValue({ data: { id: 7 } });
    const wrapper = mountBanner({ id: 5, status: 'open', meta: {} });
    const banner = wrapper.getComponent(Banner);
    expect(banner.props('bannerMessage')).toBe(
      'CONVERSATION.NOT_ASSIGNED_TO_YOU'
    );
    banner.vm.$emit('primaryAction');
    await flushPromises();
    expect(ConversationApi.assignAgent).toHaveBeenCalledWith({
      conversationId: 5,
      agentId: 7,
      assigneeType: 'User',
    });
    expect(env.dispatch).toHaveBeenCalledWith('setCurrentChatAssignee', {
      conversationId: 5,
      assignee: { id: 7 },
      assigneeType: 'User',
    });
    expect(useAlert).toHaveBeenCalledWith('CONVERSATION.CHANGE_AGENT');
  });

  it('shows a toast when assigning fails', async () => {
    ConversationApi.assignAgent.mockRejectedValue(new Error('no'));
    const wrapper = mountBanner({ id: 5, meta: { assignee: { id: 2 } } });
    wrapper.getComponent(Banner).vm.$emit('primaryAction');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('CONVERSATION.CHANGE_AGENT_FAILED');
  });

  it('hides the banner for your own chats, private notes or no draft', () => {
    const mine = { id: 5, meta: { assignee: { id: 7 } } };
    expect(mountBanner(mine).findComponent(Banner).exists()).toBe(false);
    const other = { id: 5, meta: {} };
    expect(
      mountBanner(other, { message: 'Hi', isOnPrivateNote: true })
        .findComponent(Banner)
        .exists()
    ).toBe(false);
    expect(
      mountBanner(other, { message: '' }).findComponent(Banner).exists()
    ).toBe(false);
  });

  it('names a fallback bot in the handoff banner', () => {
    const wrapper = mountBanner({
      id: 5,
      status: 'pending',
      meta: { assignee_type: 'AgentBot' },
    });
    expect(wrapper.getComponent(Banner).props('bannerMessage')).toBe(
      'CONVERSATION.BOT_HANDOFF_MESSAGE:CONVERSATION.BOT_HANDOFF_FALLBACK_ASSIGNEE'
    );
  });
});
