import {
  CONTENT_TYPES,
  VOICE_CALL_STATUS,
} from 'dashboard/components-next/message/constants';
import { MESSAGE_TYPE } from 'shared/constants/messages';
import { useCallsStore } from 'dashboard/stores/calls';
import types from 'dashboard/store/mutation-types';
import {
  clearLocalCall,
  handleVoiceCallCreated,
  handleVoiceCallUpdated,
  isInbound,
  isLocalCall,
  markCallDismissed,
  markLocalCall,
  syncConversationCallVisibility,
} from '../voice';

vi.mock('dashboard/stores/calls', () => ({ useCallsStore: vi.fn() }));

let sidCounter = 0;
const nextSid = () => {
  sidCounter += 1;
  return `CA${sidCounter}`;
};

// A voice call message as the API sends it; override any field per test.
const callMessage = ({ call = {}, ...attrs } = {}) => ({
  content_type: CONTENT_TYPES.VOICE_CALL,
  conversation_id: 7,
  inbox_id: 3,
  message_type: MESSAGE_TYPE.INCOMING,
  sender: { id: 50, name: 'Caller', phone_number: '+1', thumbnail: 't.png' },
  conversation: { assignee_id: null },
  call: {
    provider_call_id: nextSid(),
    id: 11,
    provider: 'twilio',
    status: VOICE_CALL_STATUS.RINGING,
    direction: 'incoming',
    ...call,
  },
  ...attrs,
});

describe('voice helper (OneTeam)', () => {
  let store;

  beforeEach(() => {
    store = {
      calls: [],
      addCall: vi.fn(),
      removeCall: vi.fn(),
      handleCallStatusChanged: vi.fn(),
    };
    useCallsStore.mockReturnValue(store);
  });

  it('tracks the call this tab owns', () => {
    expect(isLocalCall('CA-x')).toBe(false);
    markLocalCall('CA-x');
    expect(isLocalCall('CA-x')).toBe(true);
    expect(isLocalCall('CA-y')).toBe(false);
    expect(isLocalCall(null)).toBe(false);
    clearLocalCall('CA-y');
    expect(isLocalCall('CA-x')).toBe(true);
    clearLocalCall('CA-x');
    expect(isLocalCall('CA-x')).toBe(false);
    markLocalCall(undefined);
    expect(isLocalCall('CA-x')).toBe(false);
  });

  it('knows inbound calls', () => {
    expect(isInbound('inbound')).toBe(true);
    expect(isInbound('outbound')).toBe(false);
  });

  describe('handleVoiceCallCreated', () => {
    it('ignores other messages, dismissed calls and calls that are not ringing', () => {
      handleVoiceCallCreated({ content_type: 'text' }, 1, 'online');
      handleVoiceCallCreated(null, 1, 'online');

      const dismissed = callMessage();
      markCallDismissed(dismissed.call.provider_call_id);
      markCallDismissed(null);
      handleVoiceCallCreated(dismissed, 1, 'online');

      handleVoiceCallCreated(
        callMessage({ call: { status: 'completed' } }),
        1,
        'online'
      );
      expect(store.addCall).not.toHaveBeenCalled();
    });

    it('rings an unassigned inbound call with the caller details', () => {
      const message = callMessage();
      handleVoiceCallCreated(message, 1, 'online');
      expect(store.addCall).toHaveBeenCalledWith({
        callSid: message.call.provider_call_id,
        callId: 11,
        provider: 'twilio',
        conversationId: 7,
        inboxId: 3,
        callDirection: 'inbound',
        senderId: 50,
        caller: {
          name: 'Caller',
          phone: '+1',
          avatar: 't.png',
          additionalAttributes: {},
        },
      });
    });

    it('takes the inbox from the conversation and the avatar over the thumbnail', () => {
      handleVoiceCallCreated(
        callMessage({
          inbox_id: undefined,
          conversation: { inbox_id: 9, meta: { assignee: { id: 1 } } },
          sender: { id: 50, avatar: 'a.png', additional_attributes: { x: 1 } },
        }),
        1,
        'online'
      );
      expect(store.addCall).toHaveBeenCalledWith(
        expect.objectContaining({
          inboxId: 9,
          caller: expect.objectContaining({
            avatar: 'a.png',
            additionalAttributes: { x: 1 },
          }),
        })
      );
    });

    it('does not ring agents who are offline or not the assignee', () => {
      handleVoiceCallCreated(callMessage(), 1, 'busy');
      handleVoiceCallCreated(
        callMessage({ conversation: { assignee_id: 2 } }),
        1,
        'online'
      );
      expect(store.addCall).not.toHaveBeenCalled();
    });

    it('shows assigned calls when the current user is unknown', () => {
      handleVoiceCallCreated(
        callMessage({ conversation: { assignee_id: 2 } }),
        undefined,
        'online'
      );
      expect(store.addCall).toHaveBeenCalled();
    });

    it('shows outbound calls only to the agent who started them, even when offline', () => {
      const outbound = attrs =>
        callMessage({
          call: { direction: 'outgoing' },
          message_type: MESSAGE_TYPE.OUTGOING,
          conversation: { assignee_id: 2 },
          ...attrs,
        });
      handleVoiceCallCreated(outbound({ sender: { id: 99 } }), 1, 'online');
      expect(store.addCall).not.toHaveBeenCalled();

      handleVoiceCallCreated(outbound({ sender: { id: 1 } }), 1, 'offline');
      expect(store.addCall).toHaveBeenCalledWith(
        expect.objectContaining({ callDirection: 'outbound', caller: null })
      );
    });

    it('skips the caller snapshot for incoming messages without a sender', () => {
      handleVoiceCallCreated(callMessage({ sender: undefined }), 1, 'online');
      expect(store.addCall).toHaveBeenCalledWith(
        expect.objectContaining({ caller: null, senderId: undefined })
      );
    });

    it('treats a message without call data as not ringing', () => {
      handleVoiceCallCreated(
        { content_type: CONTENT_TYPES.VOICE_CALL },
        1,
        'online'
      );
      expect(store.addCall).not.toHaveBeenCalled();
    });
  });

  describe('handleVoiceCallUpdated', () => {
    const commit = vi.fn();

    it('ignores other messages', () => {
      handleVoiceCallUpdated(commit, { content_type: 'text' }, 1, 'online');
      expect(commit).not.toHaveBeenCalled();
    });

    it('records the status and dismisses ended calls', () => {
      const message = callMessage({ call: { status: 'completed' } });
      const callSid = message.call.provider_call_id;
      handleVoiceCallUpdated(commit, message, 1, 'online');
      expect(store.handleCallStatusChanged).toHaveBeenCalledWith({
        callSid,
        status: 'completed',
        conversationId: 7,
      });
      expect(commit).toHaveBeenCalledWith(types.UPDATE_MESSAGE_CALL_STATUS, {
        conversationId: 7,
        callStatus: 'completed',
        callSid,
      });
      expect(store.addCall).not.toHaveBeenCalled();

      // A late "ringing" snapshot of the same call no longer rings.
      handleVoiceCallCreated(
        callMessage({ call: { provider_call_id: callSid } }),
        1,
        'online'
      );
      expect(store.addCall).not.toHaveBeenCalled();
    });

    it('removes calls that belong to another agent', () => {
      const message = callMessage({ conversation: { assignee_id: 2 } });
      handleVoiceCallUpdated(commit, message, 1, 'online');
      expect(store.removeCall).toHaveBeenCalledWith(
        message.call.provider_call_id
      );
    });

    it('rings again while ringing, unless the agent is offline', () => {
      handleVoiceCallUpdated(commit, callMessage(), 1, 'offline');
      expect(store.addCall).not.toHaveBeenCalled();
      handleVoiceCallUpdated(commit, callMessage(), 1, 'online');
      expect(store.addCall).toHaveBeenCalled();
    });

    it('does not ring for other ongoing statuses', () => {
      handleVoiceCallUpdated(
        commit,
        callMessage({ call: { status: 'in-progress' } }),
        1,
        'online'
      );
      expect(store.addCall).not.toHaveBeenCalled();
    });
  });

  describe('syncConversationCallVisibility', () => {
    it('does nothing while the conversation is unassigned or assigned to the user', () => {
      syncConversationCallVisibility({ id: 7 }, 1);
      syncConversationCallVisibility({ id: 7, assignee_id: 1 }, 1);
      syncConversationCallVisibility(undefined, 1);
      expect(store.removeCall).not.toHaveBeenCalled();
    });

    it('removes inbound calls of a conversation reassigned to someone else', () => {
      store.calls = [
        { callSid: 'in', conversationId: 7, callDirection: 'inbound' },
        {
          callSid: 'out',
          conversationId: 7,
          callDirection: 'outbound',
          senderId: 1,
        },
        { callSid: 'other', conversationId: 8, callDirection: 'inbound' },
      ];
      syncConversationCallVisibility({ id: 7, assignee_id: 2 }, 1);
      expect(store.removeCall.mock.calls).toEqual([['in']]);
    });
  });
});
