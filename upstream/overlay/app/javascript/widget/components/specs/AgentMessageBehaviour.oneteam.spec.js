/**
 * OneTeam behaviour spec for agent messages in the web widget.
 *
 * Covers the agent name and avatar fallbacks (sender, sender attributes,
 * inbox avatar for bots, default bot), hiding the bubble for answered
 * selects, recorded responses for emails and selects, submitted forms,
 * attachments (image, video, audio, file and load errors that reset when
 * the message changes), the reply chip, translation flags and the reply
 * button.
 */
import { mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { MESSAGE_TYPE } from 'widget/helpers/constants';
import AgentMessage from '../AgentMessage.vue';

const named = (name, props = []) => ({
  name,
  props,
  emits: ['error', 'click'],
  template: `<div class="${name}" @click="$emit('click')" />`,
});
const stubs = {
  Avatar: named('Avatar', ['src', 'name']),
  AgentMessageBubble: named('AgentMessageBubble', [
    'message',
    'translating',
    'translated',
    'contentType',
  ]),
  ImageBubble: named('ImageBubble', ['url']),
  VideoBubble: named('VideoBubble', ['url']),
  FileBubble: named('FileBubble', ['url']),
  UserMessage: named('UserMessage', ['message']),
  MessageReplyButton: named('MessageReplyButton'),
  ReplyToChip: named('ReplyToChip', ['replyTo']),
};

const mountMessage = (message, props = {}) =>
  mount(AgentMessage, { props: { message, ...props }, global: { stubs } });
const base = {
  id: 1,
  content: 'Hello',
  showAvatar: true,
  created_at: 1700000000,
};
const avatar = wrapper => wrapper.findComponent({ name: 'Avatar' });

describe('AgentMessage behaviour', () => {
  beforeEach(() => {
    window.chatwootWebChannel = {
      enabledFeatures: [],
      avatarUrl: '/inbox.png',
      websiteName: 'Acme',
    };
  });
  afterEach(() => {
    delete window.chatwootWebChannel;
  });

  it('names and pictures the sender', () => {
    let wrapper = mountMessage({
      ...base,
      sender: { name: 'Jane', avatar_url: '/jane.png' },
    });
    expect(avatar(wrapper).props()).toMatchObject({
      name: 'Jane',
      src: '/jane.png',
    });
    expect(wrapper.find('.agent-name').text()).toBe('Jane');

    wrapper = mountMessage({
      ...base,
      additional_attributes: {
        sender_name: 'Bot X',
        sender_avatar_url: '/x.png',
      },
    });
    expect(avatar(wrapper).props()).toMatchObject({
      name: 'Bot X',
      src: '/x.png',
    });

    wrapper = mountMessage({ ...base });
    expect(avatar(wrapper).props()).toMatchObject({
      name: 'UNREAD_VIEW.BOT',
      src: '/assets/images/chatwoot_bot.png',
    });

    window.chatwootWebChannel.enabledFeatures = ['use_inbox_avatar_for_bot'];
    wrapper = mountMessage({
      ...base,
      message_type: MESSAGE_TYPE.TEMPLATE,
      sender: { name: 'Jane' },
    });
    expect(avatar(wrapper).props()).toMatchObject({
      name: 'Jane',
      src: '/inbox.png',
    });
    wrapper = mountMessage({ ...base });
    expect(avatar(wrapper).props('name')).toBe('Acme');
  });

  it('hides the avatar and name for grouped messages', () => {
    const wrapper = mountMessage({ ...base, showAvatar: false });
    expect(avatar(wrapper).exists()).toBe(false);
    expect(wrapper.find('.agent-name').exists()).toBe(false);
    expect(
      wrapper.findComponent({ name: 'AgentMessageBubble' }).props('message')
    ).toBe('Hello');
  });

  it('records email and select responses', () => {
    let wrapper = mountMessage({
      ...base,
      content_type: 'input_email',
      content_attributes: { submitted_email: 'a@b.c' },
    });
    expect(wrapper.classes()).toContain('has-response');
    expect(
      wrapper.findComponent({ name: 'UserMessage' }).props('message')
    ).toEqual({ content: 'a@b.c' });

    wrapper = mountMessage({
      ...base,
      content: '',
      content_type: 'input_select',
      content_attributes: {
        submitted_values: [{ title: 'Sales', value: 'sales' }],
      },
    });
    expect(wrapper.findComponent({ name: 'AgentMessageBubble' }).exists()).toBe(
      false
    );
    expect(
      wrapper.findComponent({ name: 'UserMessage' }).props('message')
    ).toEqual({ content: 'Sales' });

    wrapper = mountMessage({
      ...base,
      content_type: 'input_select',
      content_attributes: { submitted_values: [{ value: 'sales' }] },
    });
    expect(wrapper.findComponent({ name: 'AgentMessageBubble' }).exists()).toBe(
      true
    );
    expect(
      wrapper.findComponent({ name: 'UserMessage' }).props('message')
    ).toEqual({ content: 'sales' });

    wrapper = mountMessage({
      ...base,
      content_type: 'input_select',
      content_attributes: { submitted_values: [] },
    });
    expect(
      wrapper.findComponent({ name: 'UserMessage' }).props('message')
    ).toEqual({ content: undefined });

    wrapper = mountMessage({
      ...base,
      content_type: 'cards',
      content_attributes: { submitted_values: [{ value: 'x' }] },
    });
    expect(
      wrapper.findComponent({ name: 'UserMessage' }).props('message')
    ).toBe('');
  });

  it('shows submitted form values instead of the form', () => {
    const wrapper = mountMessage({
      ...base,
      content_type: 'form',
      content_attributes: {
        submitted_values: [
          { name: 'email', value: 'a@b.c' },
          { name: 'phone', value: '123' },
        ],
      },
    });
    expect(wrapper.find('.agent-message').exists()).toBe(false);
    expect(
      wrapper
        .findAllComponents({ name: 'UserMessage' })
        .map(m => m.props('message'))
    ).toEqual([
      { id: 'email', content: 'a@b.c' },
      { id: 'phone', content: '123' },
    ]);
  });

  it('widens unanswered forms', () => {
    const wrapper = mountMessage({
      ...base,
      content_type: 'form',
      content_attributes: {},
    });
    expect(wrapper.find('.space-y-2').classes()).toContain('w-full');
  });

  it('renders attachments and drops broken media until the message changes', async () => {
    const message = {
      ...base,
      content: '',
      attachments: [
        { id: 1, file_type: 'image', data_url: '/a.png' },
        { id: 2, file_type: 'video', data_url: '/v.mp4' },
        { id: 3, file_type: 'audio', data_url: '/s.mp3' },
        { id: 4, file_type: 'file', data_url: '/f.pdf' },
      ],
    };
    const wrapper = mountMessage(message);
    expect(wrapper.find('.has-attachment').classes()).not.toContain('has-text');
    expect(wrapper.find('audio source').attributes('src')).toBe('/s.mp3');
    expect(
      wrapper.findAllComponents({ name: 'FileBubble' }).map(f => f.props('url'))
    ).toEqual(['/a.png', '/f.pdf']);
    await wrapper.findComponent({ name: 'ImageBubble' }).vm.$emit('error');
    await wrapper.findComponent({ name: 'VideoBubble' }).vm.$emit('error');
    expect(wrapper.findComponent({ name: 'ImageBubble' }).exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'VideoBubble' }).exists()).toBe(false);
    await wrapper.setProps({
      message: { ...message, content: 'Now with text' },
    });
    expect(wrapper.findComponent({ name: 'ImageBubble' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'VideoBubble' }).exists()).toBe(true);
    expect(wrapper.find('.has-attachment').classes()).toContain('has-text');
  });

  it('shows the reply chip and translation flags', () => {
    const wrapper = mountMessage(
      {
        ...base,
        sender: { type: 'user', name: 'Jane' },
        content_attributes: {
          translation_pending: true,
          source_language: 'fr',
          translations: { en: 'Hello' },
        },
      },
      { replyTo: { content: 'Earlier' } }
    );
    expect(
      wrapper.findComponent({ name: 'ReplyToChip' }).props('replyTo')
    ).toEqual({ content: 'Earlier' });
    const bubble = wrapper.findComponent({ name: 'AgentMessageBubble' });
    expect(bubble.props('translating')).toBe(true);
    expect(typeof bubble.props('translated')).toBe('boolean');
    expect(
      mountMessage(base, { replyTo: { id: 9 } })
        .findComponent({ name: 'ReplyToChip' })
        .exists()
    ).toBe(false);
  });

  it('asks to reply to the message', async () => {
    const handler = vi.fn();
    emitter.on(BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, handler);
    const wrapper = mountMessage(base);
    await wrapper
      .findComponent({ name: 'MessageReplyButton' })
      .trigger('click');
    expect(handler).toHaveBeenCalledWith(base);
    emitter.off(BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, handler);
  });

  it('uses defaults for a bare message', () => {
    const wrapper = mountMessage({});
    expect(wrapper.find('.agent-message').exists()).toBe(true);
    expect(wrapper.vm.messageType).toBe(1);
    expect(wrapper.vm.contentType).toBe('');
  });
});
