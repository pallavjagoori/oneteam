/**
 * OneTeam specs for the widget's live updates: new and edited messages,
 * typing indicators, conversation status, agent presence and reconnects.
 */
import ActionCableConnector from '../actionCable';
import { IFrameHelper } from 'widget/helpers/utils';
import { emitter } from 'shared/helpers/mitt';

vi.mock('@rails/actioncable', () => ({
  createConsumer: () => ({
    subscriptions: { create: () => ({}) },
    disconnect: vi.fn(),
  }),
}));

describe('widget live updates', () => {
  let dispatch;
  let connector;
  const getters = {
    'conversationAttributes/getConversationParams': { id: 10 },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    dispatch = vi.fn(() => Promise.resolve());
    connector = new ActionCableConnector(
      { $store: { dispatch, getters } },
      'token'
    );
    dispatch.mockClear();
    vi.spyOn(IFrameHelper, 'sendMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps each server event to its handler', () => {
    expect(Object.keys(connector.events)).toEqual([
      'message.created',
      'message.updated',
      'conversation.typing_on',
      'conversation.typing_off',
      'conversation.status_changed',
      'conversation.created',
      'presence.update',
      'contact.merged',
    ]);
  });

  it('remembers the last message when the socket drops', () => {
    connector.onDisconnected();

    expect(dispatch).toHaveBeenCalledWith('conversation/setLastMessageId');
  });

  it('adds new messages for the open conversation and tells the site', async () => {
    const emitted = vi.fn();
    emitter.on('ON_AGENT_MESSAGE_RECEIVED', emitted);
    const message = { id: 1, conversation_id: 10, sender_type: 'User' };

    connector.onMessageCreated(message);
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalledWith(
      'conversation/addOrUpdateMessage',
      message
    );
    expect(emitted).toHaveBeenCalled();
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith({
      event: 'onEvent',
      eventIdentifier: 'chatwoot:on-message',
      data: message,
    });
    // An agent's message also plays the alert sound.
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith({
      event: 'playAudio',
    });
    emitter.off('ON_AGENT_MESSAGE_RECEIVED', emitted);
  });

  it('plays no sound for the contact’s own messages', () => {
    connector.onMessageCreated({
      id: 2,
      conversation_id: 10,
      sender_type: 'Contact',
    });

    expect(IFrameHelper.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('ignores messages from another conversation', () => {
    connector.onMessageCreated({ id: 3, conversation_id: 99 });
    connector.onMessageUpdated({ id: 3, conversation_id: 99 });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('updates edited messages and tells the site only about submitted forms', () => {
    const edited = { id: 4, conversation_id: 10 };
    const submitted = {
      id: 5,
      conversation_id: 10,
      previous_changes: { content_attributes: [{}, { submitted_values: [1] }] },
    };

    connector.onMessageUpdated(edited);
    connector.onMessageUpdated(submitted);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(IFrameHelper.sendMessage).toHaveBeenCalledTimes(1);
    expect(IFrameHelper.sendMessage.mock.calls[0][0].data).toBe(submitted);
  });

  it('resets campaigns when the conversation is resolved', () => {
    connector.onStatusChange({ status: 'resolved' });
    connector.onStatusChange({ status: 'open' });

    expect(dispatch.mock.calls).toEqual([
      ['campaign/resetCampaign'],
      ['conversationAttributes/update', { status: 'resolved' }],
      ['conversationAttributes/update', { status: 'open' }],
    ]);
  });

  it('loads the new conversation and agent presence', () => {
    connector.onConversationCreated();
    connector.onPresenceUpdate({ users: { 1: 'online' } });

    expect(dispatch).toHaveBeenCalledWith(
      'conversationAttributes/getAttributes'
    );
    expect(dispatch).toHaveBeenCalledWith('agent/updatePresence', {
      1: 'online',
    });
  });

  it('shows the typing indicator for 30 seconds at most', () => {
    connector.onTypingOn({ conversation: { id: 10 } });
    connector.onTypingOn({ conversation: { id: 10 } });
    expect(dispatch).toHaveBeenLastCalledWith(
      'conversation/toggleAgentTyping',
      { status: 'on' }
    );

    vi.advanceTimersByTime(30000);

    expect(dispatch).toHaveBeenLastCalledWith(
      'conversation/toggleAgentTyping',
      { status: 'off' }
    );
    expect(connector.CancelTyping).toBeNull();
  });

  it('ignores typing in other conversations and private notes', () => {
    connector.onTypingOn({ conversation: { id: 99 } });
    connector.onTypingOn({ conversation: { id: 10 }, is_private: true });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('crashes on contact merges, because refreshConnector does not exist (see FINDINGS.md)', () => {
    expect(() => connector.onContactMerge({ pubsub_token: 'new' })).toThrow(
      TypeError
    );
  });
});
