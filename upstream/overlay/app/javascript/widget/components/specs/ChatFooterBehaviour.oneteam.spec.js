/**
 * OneTeam behaviour spec for the widget chat footer.
 *
 * Covers sending messages and attachments (with and without a reply
 * target, refreshing attributes for a new conversation), the reply-to
 * preview from the event bus, the resolved state (start a new
 * conversation, email transcript with cooldown, success and error
 * alerts), and the flat widget style.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { sendEmailTranscript } from 'widget/api/conversation';
import { IFrameHelper } from 'widget/helpers/utils';
import ChatFooter from '../ChatFooter.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => env.router,
}));
vi.mock('widget/api/conversation', () => ({ sendEmailTranscript: vi.fn() }));
vi.mock('widget/helpers/utils', () => ({
  IFrameHelper: { sendMessage: vi.fn() },
}));

const Input = {
  name: 'ChatInputWrap',
  props: ['onSendMessage', 'onSendAttachment'],
  template: '<div />',
};
const ReplyTo = {
  name: 'FooterReplyTo',
  props: ['inReplyTo'],
  emits: ['dismiss'],
  template: '<div class="reply" />',
};
const CustomButton = {
  name: 'CustomButton',
  props: ['disabled', 'bgColor', 'textColor'],
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};

const mountFooter = async ({
  status = 'open',
  allowAfterResolved = false,
  user = { has_email: true },
  size = 0,
  flat = false,
} = {}) => {
  window.chatwootWebChannel = {
    allowMessagesAfterResolved: allowAfterResolved,
  };
  env.router = { replace: vi.fn() };
  env.actions = {
    sendMessage: vi.fn(),
    sendAttachment: vi.fn(),
    getAttributes: vi.fn(),
  };
  const store = createStore({
    modules: {
      conversation: {
        namespaced: true,
        getters: { getConversationSize: () => size },
        actions: {
          sendMessage: (_, p) => env.actions.sendMessage(p),
          sendAttachment: (_, p) => env.actions.sendAttachment(p),
        },
      },
      conversationAttributes: {
        namespaced: true,
        getters: { getConversationParams: () => ({ status }) },
        actions: { getAttributes: () => env.actions.getAttributes() },
      },
      appConfig: {
        namespaced: true,
        getters: {
          getWidgetColor: () => '#000000',
          isWidgetStyleFlat: () => flat,
        },
      },
      contacts: { namespaced: true, getters: { getCurrentUser: () => user } },
    },
  });
  const wrapper = mount(ChatFooter, {
    global: {
      plugins: [store],
      stubs: { ChatInputWrap: Input, FooterReplyTo: ReplyTo, CustomButton },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};

let wrapper;

describe('Widget chat footer behaviour', () => {
  afterEach(() => {
    wrapper?.unmount();
    vi.useRealTimers();
  });

  it('sends messages and refreshes attributes for a new conversation', async () => {
    wrapper = await mountFooter();
    expect(wrapper.find('footer').classes()).toContain('rounded-lg');
    await wrapper.findComponent(Input).props('onSendMessage')('Hi');
    expect(env.actions.sendMessage).toHaveBeenCalledWith({
      content: 'Hi',
      replyTo: null,
    });
    expect(env.actions.getAttributes).toHaveBeenCalled();
    wrapper.unmount();

    wrapper = await mountFooter({ size: 3, flat: true });
    expect(wrapper.find('footer').classes()).not.toContain('rounded-lg');
    await wrapper.findComponent(Input).props('onSendMessage')('Again');
    expect(env.actions.getAttributes).not.toHaveBeenCalled();
    await wrapper.findComponent(Input).props('onSendAttachment')({ file: 'f' });
    expect(env.actions.sendAttachment).toHaveBeenCalledWith({
      attachment: { file: 'f' },
      replyTo: null,
    });
  });

  it('replies to a message picked on the event bus', async () => {
    wrapper = await mountFooter({ size: 2 });
    emitter.emit(BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, {
      id: 5,
      content: 'Earlier',
    });
    await flushPromises();
    expect(wrapper.findComponent(ReplyTo).props('inReplyTo')).toEqual({
      id: 5,
      content: 'Earlier',
    });
    expect(wrapper.find('footer').classes()).toContain('rounded-t-none');
    await wrapper.findComponent(Input).props('onSendMessage')('Answer');
    expect(env.actions.sendMessage).toHaveBeenCalledWith({
      content: 'Answer',
      replyTo: 5,
    });
    await flushPromises();
    expect(wrapper.find('.reply').exists()).toBe(false);

    emitter.emit(BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, {
      id: 6,
      attachments: [{}],
    });
    await flushPromises();
    await wrapper.findComponent(Input).props('onSendAttachment')('a');
    expect(env.actions.sendAttachment).toHaveBeenCalledWith({
      attachment: 'a',
      replyTo: 6,
    });

    emitter.emit(BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, { id: 7, content: 'x' });
    await flushPromises();
    await wrapper.findComponent(ReplyTo).vm.$emit('dismiss');
    expect(wrapper.find('.reply').exists()).toBe(false);
    emitter.emit(BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, { id: 8 });
    await flushPromises();
    expect(wrapper.find('.reply').exists()).toBe(false);
  });

  it('keeps the reply box for resolved chats when allowed', async () => {
    wrapper = await mountFooter({
      status: 'resolved',
      allowAfterResolved: true,
    });
    expect(wrapper.find('footer').exists()).toBe(true);
  });

  it('starts a new conversation after resolution', async () => {
    wrapper = await mountFooter({ status: 'resolved', user: null });
    const buttons = wrapper.findAllComponents(CustomButton);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props()).toMatchObject({
      bgColor: '#000000',
      textColor: '#FFFFFF',
    });
    await buttons[0].trigger('click');
    expect(env.router.replace).toHaveBeenCalledWith({ name: 'prechat-form' });
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith({
      event: 'onEvent',
      eventIdentifier: 'chatwoot:on-start-conversation',
      data: { hasConversation: true },
    });
  });

  it('emails the transcript with a cooldown', async () => {
    vi.useFakeTimers();
    const alerts = [];
    const onAlert = payload => alerts.push(payload);
    emitter.on(BUS_EVENTS.SHOW_ALERT, onAlert);
    wrapper = await mountFooter({ status: 'resolved' });
    const transcript = () => wrapper.findAllComponents(CustomButton)[1];

    let finish;
    sendEmailTranscript.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    transcript().vm.$emit('click');
    await flushPromises();
    expect(transcript().props('disabled')).toBe(true);
    transcript().vm.$emit('click');
    finish();
    await flushPromises();
    expect(sendEmailTranscript).toHaveBeenCalledTimes(1);
    expect(alerts.at(-1)).toEqual({
      message: 'EMAIL_TRANSCRIPT.SEND_EMAIL_SUCCESS',
      type: 'success',
    });

    transcript().vm.$emit('click');
    expect(sendEmailTranscript).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(15000);
    expect(transcript().props('disabled')).toBe(false);

    sendEmailTranscript.mockRejectedValueOnce(new Error('x'));
    transcript().vm.$emit('click');
    await flushPromises();
    expect(alerts.at(-1)).toEqual({
      message: 'EMAIL_TRANSCRIPT.SEND_EMAIL_ERROR',
    });
    expect(transcript().props('disabled')).toBe(false);
    emitter.off(BUS_EVENTS.SHOW_ALERT, onAlert);
  });

  it('does nothing without an email address', async () => {
    wrapper = await mountFooter({
      status: 'resolved',
      user: { has_email: false },
    });
    expect(wrapper.findAllComponents(CustomButton)).toHaveLength(1);
    await wrapper.vm.sendTranscript();
    expect(sendEmailTranscript).not.toHaveBeenCalled();
  });
});
