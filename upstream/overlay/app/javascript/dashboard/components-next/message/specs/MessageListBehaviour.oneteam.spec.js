/**
 * OneTeam behaviour spec for the conversation message list.
 *
 * Covers camel-casing messages, merging campaign history into the
 * timeline by time, the unread badge slot, grouping consecutive messages
 * (same sender and type within a minute, failed or template messages,
 * the last entry), resolving replied-to messages from props, the store
 * or the API (found, missing, error, cached), and the retry event.
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import MessageApi from 'dashboard/api/inbox/message.js';
import MessageList from '../MessageList.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/store.js', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: () => computed(() => env.getters.chat) };
});
vi.mock('dashboard/api/inbox/message.js', () => ({
  default: { getPreviousMessages: vi.fn() },
}));

const MessageStub = {
  name: 'Message',
  props: [
    'id',
    'inReplyTo',
    'groupWithNext',
    'isEmailInbox',
    'contentAttributes',
  ],
  emits: ['retry'],
  template: '<li class="message" />',
};
const Campaign = {
  name: 'CampaignMessage',
  props: ['recipient'],
  template: '<li class="campaign" />',
};

const message = (id, extra = {}) => ({
  id,
  sender_id: 1,
  message_type: 0,
  created_at: 600,
  ...extra,
});

const mountList = (props = {}, chat = {}) => {
  env.getters = reactive({ chat });
  return mount(MessageList, {
    props: { currentUserId: 1, ...props },
    global: { stubs: { Message: MessageStub, CampaignMessage: Campaign } },
    slots: {
      unreadBadge: '<li class="unread" />',
      beforeAll: '<li class="before" />',
      after: '<li class="after" />',
    },
  });
};

const groups = wrapper =>
  wrapper.findAllComponents(MessageStub).map(m => m.props('groupWithNext'));

describe('MessageList behaviour', () => {
  beforeEach(() => {
    MessageApi.getPreviousMessages.mockReset();
  });

  it('renders messages with the unread badge and slots', () => {
    const wrapper = mountList({
      messages: [message(1), message(2)],
      firstUnreadId: 2,
      isAnEmailChannel: true,
    });
    const items = wrapper.findAll('li').map(li => li.classes()[0]);
    expect(items).toEqual(['before', 'message', 'unread', 'message', 'after']);
    expect(wrapper.findComponent(MessageStub).props('isEmailInbox')).toBe(true);
    expect(
      mountList({ messages: [message(1)] })
        .find('.unread')
        .exists()
    ).toBe(false);
  });

  it('merges campaign history into the timeline by time', () => {
    const wrapper = mountList({
      messages: [
        message(1, { created_at: 100 }),
        message(2, { created_at: 300 }),
      ],
      campaignHistory: [{ id: 9, sent_at: 200 }],
    });
    expect(
      wrapper.findAll('.message, .campaign').map(li => li.classes()[0])
    ).toEqual(['message', 'campaign', 'message']);
    expect(groups(wrapper)).toEqual([false, false]);
  });

  it('groups messages from one sender within a minute', () => {
    const wrapper = mountList({
      messages: [
        message(1),
        message(2, { created_at: 610 }),
        message(3, { created_at: 700 }),
        message(4, { created_at: 700, status: 'failed' }),
        message(5, { created_at: 700, sender_id: 2 }),
        message(6, {
          created_at: 700,
          sender_id: undefined,
          sender: { id: 2 },
        }),
        message(7, {
          created_at: 700,
          sender_id: undefined,
          sender: { id: 2 },
          message_type: 1,
        }),
        message(8, { created_at: 700, sender_id: 2, message_type: 3 }),
        message(9, { created_at: 700, sender_id: 2, message_type: 3 }),
        message(10, { created_at: 700, sender_id: undefined }),
      ],
    });
    expect(groups(wrapper)).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('finds replied-to messages in props or the store', () => {
    const wrapper = mountList(
      {
        messages: [
          message(1),
          message(2, { content_attributes: { in_reply_to: 1 } }),
          message(3, { content_attributes: { in_reply_to: 50 } }),
          message(4, { content_attributes: {} }),
        ],
      },
      { messages: [{ id: 50, content: 'from store' }] }
    );
    const replies = wrapper
      .findAllComponents(MessageStub)
      .map(m => m.props('inReplyTo'));
    expect(replies[0]).toBe(null);
    expect(replies[1]).toMatchObject({ id: 1, senderId: 1 });
    expect(replies[2]).toMatchObject({ id: 50, content: 'from store' });
    expect(replies[3]).toBe(null);
  });

  it('returns nothing for unknown replies without a conversation', () => {
    const wrapper = mountList({
      messages: [message(2, { content_attributes: { in_reply_to: 77 } })],
    });
    expect(wrapper.findComponent(MessageStub).props('inReplyTo')).toBe(null);
    expect(MessageApi.getPreviousMessages).not.toHaveBeenCalled();
  });

  it('fetches missing replies once and caches the result', async () => {
    MessageApi.getPreviousMessages.mockResolvedValue({
      data: { payload: [{ id: 200, content_type: 'text' }] },
    });
    const wrapper = mountList(
      { messages: [message(2, { content_attributes: { in_reply_to: 200 } })] },
      { id: 5 }
    );
    expect(MessageApi.getPreviousMessages).toHaveBeenCalledWith({
      conversationId: 5,
      before: 300,
      after: 100,
    });
    await flushPromises();
    expect(wrapper.findComponent(MessageStub).props('inReplyTo')).toMatchObject(
      { id: 200, contentType: 'text' }
    );
    await wrapper.setProps({
      messages: [message(3, { content_attributes: { in_reply_to: 200 } })],
    });
    expect(MessageApi.getPreviousMessages).toHaveBeenCalledTimes(1);
  });

  it('caches replies that cannot be found or fail to load', async () => {
    MessageApi.getPreviousMessages.mockResolvedValueOnce({ data: {} });
    MessageApi.getPreviousMessages.mockRejectedValueOnce(new Error('down'));
    const wrapper = mountList(
      {
        messages: [
          message(2, { content_attributes: { in_reply_to: 300 } }),
          message(3, { content_attributes: { in_reply_to: 400 } }),
        ],
      },
      { id: 5 }
    );
    await flushPromises();
    const calls = MessageApi.getPreviousMessages.mock.calls.length;
    await wrapper.setProps({
      messages: [
        message(4, { content_attributes: { in_reply_to: 300 } }),
        message(5, { content_attributes: { in_reply_to: 400 } }),
      ],
    });
    await flushPromises();
    expect(MessageApi.getPreviousMessages.mock.calls.length).toBe(calls);
    expect(
      wrapper.findAllComponents(MessageStub).map(m => m.props('inReplyTo'))
    ).toEqual([null, null]);
  });

  it('re-emits retries with the camel-cased message', async () => {
    const wrapper = mountList({ messages: [message(1)] });
    await wrapper.findComponent(MessageStub).vm.$emit('retry');
    expect(wrapper.emitted('retry')[0][0]).toMatchObject({
      id: 1,
      senderId: 1,
    });
  });
});
