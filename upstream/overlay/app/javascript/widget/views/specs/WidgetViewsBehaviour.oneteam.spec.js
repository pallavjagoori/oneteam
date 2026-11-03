/**
 * OneTeam behaviour spec for small widget views.
 *
 * Covers the messages view marking the conversation seen, the unread view
 * closing the bubble only inside an iframe, and the pre-chat view routing to
 * messages once a conversation is created.
 */
import { shallowMount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { emitter } from 'shared/helpers/mitt';
import { ON_CONVERSATION_CREATED } from 'widget/constants/widgetBusEvents';
import MessagesView from '../Messages.vue';
import UnreadMessages from '../UnreadMessages.vue';
import PreChatFormView from '../PreChatForm.vue';

const env = vi.hoisted(() => ({
  replace: vi.fn(),
  isIFrame: false,
  send: vi.fn(),
}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ replace: env.replace }),
}));
vi.mock('widget/helpers/utils', async importOriginal => ({
  ...(await importOriginal()),
  IFrameHelper: {
    isIFrame: () => env.isIFrame,
    sendMessage: (...args) => env.send(...args),
  },
}));

window.chatwootWebChannel = {
  preChatFormEnabled: true,
  preChatFormOptions: { pre_chat_fields: [], pre_chat_message: '' },
};

const setUserLastSeen = vi.fn();
const store = createStore({
  modules: {
    conversation: {
      namespaced: true,
      getters: {
        getGroupedConversation: () => [],
        getUnreadTextMessages: () => [{ id: 1 }],
      },
      actions: { setUserLastSeen, clearConversations: vi.fn() },
    },
    conversationAttributes: {
      namespaced: true,
      actions: { clearConversationAttributes: vi.fn() },
    },
  },
});
const mountOptions = { global: { plugins: [store] } };

describe('Widget views', () => {
  it('marks the conversation seen when messages open', () => {
    shallowMount(MessagesView, mountOptions);
    expect(setUserLastSeen).toHaveBeenCalledTimes(1);
  });

  it('closes the bubble from the unread view only inside an iframe', () => {
    const wrapper = shallowMount(UnreadMessages, mountOptions);
    const list = wrapper.findComponent({ name: 'UnreadMessageList' });
    expect(list.props('messages')).toEqual([{ id: 1 }]);
    env.isIFrame = false;
    list.vm.$emit('close');
    expect(env.send).not.toHaveBeenCalled();
    env.isIFrame = true;
    list.vm.$emit('close');
    expect(env.send).toHaveBeenCalledWith({ event: 'toggleBubble' });
  });

  it('routes to messages after a conversation is created until unmounted', () => {
    const wrapper = shallowMount(PreChatFormView, mountOptions);
    emitter.emit(ON_CONVERSATION_CREATED);
    expect(env.replace).toHaveBeenCalledWith({ name: 'messages' });
    wrapper.unmount();
    env.replace.mockClear();
    emitter.emit(ON_CONVERSATION_CREATED);
    expect(env.replace).not.toHaveBeenCalled();
  });
});
