/**
 * OneTeam behaviour spec for the widget's message composer.
 *
 * Covers focusing when the widget opens, typing indicators, focus styling,
 * sending with the button or Enter (ignoring blank text and Shift+Enter),
 * attachment vs send button, the emoji picker (toggle, insert, close on
 * Escape or outside click) and removing the key listener on unmount.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import ChatInputWrap from '../ChatInputWrap.vue';

const env = vi.hoisted(() => ({}));

vi.mock('../../composables/useAttachments', () => ({
  useAttachments: () => ({
    canHandleAttachments: env.canAttach,
    shouldShowEmojiPicker: env.showEmoji,
    hasEmojiPickerEnabled: env.emojiEnabled,
  }),
}));
vi.mock('shared/components/emoji/EmojiPicker.vue', () => ({
  __esModule: true,
  default: {
    name: 'EmojiPicker',
    emits: ['select'],
    template: '<div class="emoji-picker" />',
  },
}));

const TextArea = {
  name: 'ResizableTextArea',
  props: ['modelValue'],
  emits: ['update:modelValue', 'typingOff', 'typingOn', 'focus', 'blur'],
  methods: { focus: () => env.focused.push(true) },
  template: '<textarea />',
};
const SendButton = {
  name: 'ChatSendButton',
  props: ['color'],
  emits: ['click'],
  template: '<button class="send" @click="$emit(\'click\')" />',
};

const mountComposer = (props = {}) =>
  mount(ChatInputWrap, {
    props: { onSendMessage: env.send, ...props },
    attachTo: document.body,
    global: {
      mocks: {
        $store: {
          getters: {
            'appConfig/getWidgetColor': '#123456',
            'appConfig/getIsWidgetOpen': env.open.value,
            'appConfig/getShouldShowEmojiPicker': true,
          },
          dispatch: env.dispatch,
        },
      },
      directives: {
        onClickaway: { mounted: (el, binding) => { env.clickaway = binding.value; } },
      },
      stubs: {
        ResizableTextArea: TextArea,
        ChatSendButton: SendButton,
        ChatAttachmentButton: { props: ['onAttach'], template: '<div class="attach" />' },
        FluentIcon: true,
      },
    },
  });

const type = (wrapper, text) =>
  wrapper.findComponent(TextArea).vm.$emit('update:modelValue', text);
const pressEnter = (shiftKey = false) => {
  const event = new KeyboardEvent('keypress', { keyCode: 13, shiftKey, cancelable: true });
  document.dispatchEvent(event);
  return event;
};

describe('Widget chat input behaviour', () => {
  beforeEach(() => {
    env.canAttach = ref(true);
    env.showEmoji = ref(true);
    env.emojiEnabled = ref(true);
    env.open = ref(true);
    env.focused = [];
    env.send = vi.fn();
    env.dispatch = vi.fn();
  });

  it('focuses when mounted open, tracks focus and typing', async () => {
    const wrapper = mountComposer();
    expect(env.focused).toHaveLength(1);
    const area = wrapper.findComponent(TextArea);
    await area.vm.$emit('focus');
    expect(wrapper.classes()).toContain('!shadow-[var(--widget-color,#2781f6)]');
    await area.vm.$emit('blur');
    expect(wrapper.classes()).toContain('!shadow-n-strong');
    await area.vm.$emit('typingOn');
    await area.vm.$emit('typingOff');
    expect(env.dispatch.mock.calls).toEqual([
      ['conversation/toggleUserTyping', { typingStatus: 'on' }],
      ['conversation/toggleUserTyping', { typingStatus: 'off' }],
    ]);
    wrapper.unmount();
  });

  it('focuses when the widget opens later', async () => {
    env.open.value = false;
    const wrapper = mountComposer();
    expect(env.focused).toHaveLength(0);
    wrapper.vm.$options.watch.isWidgetOpen.call(wrapper.vm, false);
    wrapper.vm.$options.watch.isWidgetOpen.call(wrapper.vm, true);
    expect(env.focused).toHaveLength(1);
    wrapper.unmount();
  });

  it('swaps the attachment button for the send button while typing', async () => {
    const wrapper = mountComposer();
    expect(wrapper.find('.attach').exists()).toBe(true);
    expect(wrapper.find('.send').exists()).toBe(false);
    await type(wrapper, 'Hello');
    expect(wrapper.find('.attach').exists()).toBe(false);
    expect(wrapper.findComponent(SendButton).props('color')).toBe('#123456');
    await wrapper.find('.send').trigger('click');
    expect(env.send).toHaveBeenCalledWith('Hello');
    expect(wrapper.find('.send').exists()).toBe(false);
    wrapper.unmount();
  });

  it('sends on Enter but not on Shift+Enter or blank text', async () => {
    const wrapper = mountComposer();
    await type(wrapper, '   ');
    expect(pressEnter().defaultPrevented).toBe(true);
    expect(env.send).not.toHaveBeenCalled();
    await type(wrapper, 'Hi');
    pressEnter(true);
    expect(env.send).not.toHaveBeenCalled();
    pressEnter();
    expect(env.send).toHaveBeenCalledWith('Hi');
    wrapper.unmount();
    pressEnter();
    expect(env.send).toHaveBeenCalledTimes(1);
  });

  it('inserts emojis and closes the picker on Escape or outside clicks', async () => {
    const wrapper = mountComposer();
    await wrapper.find('button[aria-label]').trigger('click');
    await flushPromises();
    const picker = wrapper.findComponent({ name: 'EmojiPicker' });
    expect(picker.exists()).toBe(true);
    await picker.vm.$emit('select', { value: '😀' });
    expect(wrapper.findComponent(TextArea).props('modelValue')).toBe('😀 ');
    await wrapper.trigger('keydown', { key: 'Escape' });
    expect(wrapper.findComponent({ name: 'EmojiPicker' }).exists()).toBe(false);
    await wrapper.trigger('keydown', { key: 'Escape' });
    await wrapper.find('button[aria-label]').trigger('click');
    await flushPromises();
    const stop = vi.fn();
    env.clickaway({ stopPropagation: stop });
    await flushPromises();
    expect(stop).toHaveBeenCalled();
    expect(wrapper.findComponent({ name: 'EmojiPicker' }).exists()).toBe(false);
    wrapper.unmount();
  });

  it('hides the emoji button and attachments when unavailable', () => {
    env.emojiEnabled.value = false;
    env.canAttach.value = false;
    const wrapper = mountComposer();
    expect(wrapper.find('button[aria-label]').exists()).toBe(false);
    expect(wrapper.find('.attach').exists()).toBe(false);
    wrapper.unmount();
  });
});
