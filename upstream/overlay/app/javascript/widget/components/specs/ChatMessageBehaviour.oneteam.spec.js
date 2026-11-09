/**
 * OneTeam behaviour spec for the widget chat message switch.
 *
 * Covers rendering incoming messages as user messages and the rest as
 * agent messages, and resolving the replied-to message.
 */
import { mount } from '@vue/test-utils';
import ChatMessage from '../ChatMessage.vue';

/**
 * Mounts the message.
 *
 * @param {object} message message shown
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountMessage = message =>
  mount(ChatMessage, {
    props: { message },
    global: {
      mocks: {
        $store: {
          getters: { 'conversation/getConversation': { 9: { id: 9 } } },
        },
      },
      stubs: {
        UserMessage: {
          name: 'UserMessage',
          props: ['replyTo'],
          template: '<div class="user" />',
        },
        AgentMessage: {
          name: 'AgentMessage',
          props: ['replyTo'],
          template: '<div class="agent" />',
        },
      },
    },
  });

describe('ChatMessage behaviour', () => {
  it('renders incoming messages with their reply', () => {
    const wrapper = mountMessage({
      id: 1,
      message_type: 0,
      content_attributes: { in_reply_to: 9 },
    });
    const user = wrapper.findComponent({ name: 'UserMessage' });
    expect(user.attributes('id')).toBe('cwmsg-1');
    expect(user.props('replyTo')).toEqual({ id: 9 });
  });

  it('renders other messages as agent messages without a reply', () => {
    const wrapper = mountMessage({ id: 2, message_type: 1 });
    expect(
      wrapper.findComponent({ name: 'AgentMessage' }).props('replyTo')
    ).toBeNull();
  });
});
