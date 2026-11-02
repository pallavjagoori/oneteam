/**
 * OneTeam behaviour spec for a visitor's own message in the widget.
 *
 * Covers the text bubble, the replied-to chip, the reply button and
 * swipe-to-reply (both send the message on the bus), image, video and
 * file attachments (falling back once an image or video fails, and
 * resetting when the message changes), the sending and failed states,
 * and retrying a failed text message.
 *
 * Chatwoot quirk: the file bubble's `v-else` belongs to the video check,
 * so an image attachment renders both the image and a file bubble. The
 * unused `errorMessage` computed is read through the instance. The
 * `message` prop default (`() => {}`) returns undefined, and the
 * component cannot render without a message, so it stays uncovered.
 */
import { mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import UserMessage from '../UserMessage.vue';

const named = (name, props = []) => ({
  name,
  props,
  emits: ['click', 'error', 'dragged'],
  template: `<div class="${name}"><slot /></div>`,
});
const ImageBubble = named('ImageBubble', ['url']);
const VideoBubble = named('VideoBubble', ['url']);
const FileBubble = named('FileBubble', ['url', 'isInProgress']);
const MessageReplyButton = named('MessageReplyButton');
const DragWrapper = named('DragWrapper', ['direction']);

const mountMessage = (message, replyTo) => {
  const dispatch = vi.fn();
  const wrapper = mount(UserMessage, {
    props: { message, replyTo },
    global: {
      mocks: {
        $store: { getters: { 'appConfig/getWidgetColor': '#123' }, dispatch },
      },
      stubs: {
        ImageBubble,
        VideoBubble,
        FileBubble,
        MessageReplyButton,
        DragWrapper,
        UserMessageBubble: named('UserMessageBubble', ['message', 'status']),
        ReplyToChip: named('ReplyToChip', ['replyTo']),
        FluentIcon: true,
      },
    },
  });
  return { wrapper, dispatch };
};

const text = {
  id: 1,
  content: 'Hello',
  status: 'sent',
  created_at: 1_772_618_400,
};

describe('UserMessage behaviour', () => {
  it('shows text, the reply chip and replies', async () => {
    const onReply = vi.fn();
    emitter.on('TOGGLE_REPLY_TO_MESSAGE', onReply);
    const { wrapper } = mountMessage(text, { content: 'Earlier' });
    expect(wrapper.find('.UserMessageBubble').exists()).toBe(true);
    expect(wrapper.find('.ReplyToChip').exists()).toBe(true);
    await wrapper.findComponent(MessageReplyButton).vm.$emit('click');
    await wrapper.findComponent(DragWrapper).vm.$emit('dragged');
    expect(onReply).toHaveBeenCalledTimes(2);
    expect(onReply).toHaveBeenCalledWith(text);
    emitter.off('TOGGLE_REPLY_TO_MESSAGE', onReply);
    expect(wrapper.vm.errorMessage).toBe(
      'COMPONENTS.MESSAGE_BUBBLE.ERROR_MESSAGE'
    );

    expect(
      mountMessage(text, { attachments: [{}] })
        .wrapper.find('.ReplyToChip')
        .exists()
    ).toBe(true);
    expect(mountMessage(text, {}).wrapper.find('.ReplyToChip').exists()).toBe(
      false
    );
    expect(mountMessage(text).wrapper.find('.ReplyToChip').exists()).toBe(
      false
    );
  });

  it('shows attachments and falls back after load errors', async () => {
    const message = {
      id: 2,
      status: 'in_progress',
      attachments: [
        { id: 1, file_type: 'image', data_url: 'a.png' },
        { id: 2, file_type: 'video', data_url: 'b.mp4' },
        { id: 3, file_type: 'file', data_url: 'c.pdf' },
      ],
    };
    const { wrapper } = mountMessage(message);
    expect(wrapper.find('.UserMessageBubble').exists()).toBe(false);
    expect(wrapper.find('.in-progress').exists()).toBe(true);
    expect(wrapper.findComponent(MessageReplyButton).exists()).toBe(false);
    expect(wrapper.findAllComponents(ImageBubble)).toHaveLength(1);
    expect(wrapper.findAllComponents(VideoBubble)).toHaveLength(1);
    expect(
      wrapper.findAllComponents(FileBubble).map(f => f.props('url'))
    ).toEqual(['a.png', 'c.pdf']);
    expect(wrapper.findComponent(FileBubble).props('isInProgress')).toBe(true);

    await wrapper.findComponent(ImageBubble).vm.$emit('error');
    await wrapper.findComponent(VideoBubble).vm.$emit('error');
    expect(wrapper.findComponent(ImageBubble).exists()).toBe(false);
    expect(wrapper.findAllComponents(FileBubble)).toHaveLength(3);

    await wrapper.setProps({ message: { ...message, id: 3 } });
    expect(wrapper.findComponent(ImageBubble).exists()).toBe(true);
    expect(wrapper.findComponent(VideoBubble).exists()).toBe(true);
  });

  it('retries a failed text message', async () => {
    const failed = { ...text, status: 'failed', meta: { error: 'Blocked' } };
    const { wrapper, dispatch } = mountMessage(failed);
    expect(wrapper.find('.is-failed').exists()).toBe(true);
    expect(wrapper.vm.errorMessage).toBe('Blocked');
    await wrapper
      .find('button[title="COMPONENTS.MESSAGE_BUBBLE.RETRY"]')
      .trigger('click');
    expect(dispatch).toHaveBeenCalledWith('conversation/sendMessageWithData', {
      message: failed,
    });

    const withFile = mountMessage({
      ...failed,
      attachments: [{ id: 1, file_type: 'file', data_url: 'c.pdf' }],
    });
    expect(withFile.wrapper.find('button[title]').exists()).toBe(false);
  });

  it('copes with a message without a status or time', () => {
    const { wrapper } = mountMessage({ id: 4, content: 'Hi' });
    expect(wrapper.find('.in-progress').exists()).toBe(false);
    expect(wrapper.vm.readableTime).toBeTypeOf('string');
  });
});
