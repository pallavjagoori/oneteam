import { defineComponent, reactive, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import VoiceAPI from 'dashboard/api/channel/voice/voiceAPIClient';
import TwilioVoiceClient from 'dashboard/api/channel/voice/twilioVoiceClient';
import { useAlert } from 'dashboard/composables';
import {
  cleanupWhatsappSession,
  sendWhatsappTerminateBeacon,
} from 'dashboard/composables/useWhatsappCallSession';
import {
  clearLocalCall,
  handleVoiceCallCreated,
  markCallDismissed,
  markLocalCall,
} from 'dashboard/helper/voice';
import { useCallActions, useCallSession } from '../useCallSession';

/*
 * OneTeam coverage for the call session composables. The calls store,
 * Twilio client, WhatsApp session and timer are fakes; the tests check how
 * joining, ending and rejecting route between Twilio and WhatsApp, and how
 * the root composable seeds ringing calls and manages page-level listeners.
 */
const mocks = vi.hoisted(() => ({
  store: null,
  callsStore: null,
  whatsapp: {
    endActiveCall: vi.fn(),
    acceptIncomingCall: vi.fn(),
    rejectIncomingCall: vi.fn(),
  },
  timers: [],
}));

vi.mock('vuex', () => ({ useStore: () => mocks.store }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/api/channel/voice/voiceAPIClient', () => ({
  default: { leaveConference: vi.fn(), joinConference: vi.fn() },
}));
vi.mock('dashboard/api/channel/voice/twilioVoiceClient', () => ({
  default: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    endClientCall: vi.fn(),
    initializeDevice: vi.fn(),
    joinClientCall: vi.fn(),
  },
}));
vi.mock('dashboard/stores/calls', () => ({
  useCallsStore: () => mocks.callsStore,
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useWhatsappCallSession', () => ({
  useWhatsappCallSession: () => mocks.whatsapp,
  sendWhatsappTerminateBeacon: vi.fn(),
  cleanupWhatsappSession: vi.fn(),
}));
vi.mock('dashboard/helper/voice', () => ({
  handleVoiceCallCreated: vi.fn(),
  markCallDismissed: vi.fn(),
  markLocalCall: vi.fn(),
  clearLocalCall: vi.fn(),
}));
vi.mock('dashboard/helper/Timer', () => ({
  default: class {
    constructor(onTick) {
      this.onTick = onTick;
      this.start = vi.fn();
      this.stop = vi.fn();
      mocks.timers.push(this);
    }
  },
}));

const twilioCall = {
  callSid: 'CA1',
  inboxId: 1,
  conversationId: 2,
  provider: 'twilio',
};
const whatsappCall = {
  callSid: 'wa-1',
  callId: 9,
  provider: 'whatsapp',
  sdpOffer: 'offer',
  iceServers: [],
  recordingEnabled: true,
};

const buildCallsStore = calls =>
  reactive({
    calls,
    activeCall: null,
    incomingCalls: [],
    hasActiveCall: false,
    hasIncomingCall: false,
    clearActiveCall: vi.fn(),
    setCallActive: vi.fn(),
    dismissCall: vi.fn(),
  });

const mountSession = () => {
  let api;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useCallSession();
        return () => null;
      },
    })
  );
  return { wrapper, api: () => api };
};

describe('useCallSession (OneTeam)', () => {
  beforeEach(() => {
    mocks.timers.length = 0;
    mocks.callsStore = buildCallsStore([
      twilioCall,
      whatsappCall,
      { ...whatsappCall, callSid: 'wa-out', callDirection: 'outbound' },
      { callSid: 'bare' },
    ]);
    mocks.store = reactive({ getters: { getAllConversations: [] } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('actions', () => {
    let actions;

    beforeEach(() => {
      actions = useCallActions();
    });

    it('ends a WhatsApp call by its call id', async () => {
      await actions.endCall({ callSid: 'wa-1' });
      expect(mocks.whatsapp.endActiveCall).toHaveBeenCalledWith(9);
      expect(mocks.callsStore.clearActiveCall).toHaveBeenCalled();
    });

    it('ends a Twilio call even if leaving the conference fails', async () => {
      VoiceAPI.leaveConference.mockRejectedValue(new Error('5xx'));
      await expect(
        actions.endCall({ callSid: 'CA1', inboxId: 1, conversationId: 2 })
      ).rejects.toThrow('5xx');
      expect(TwilioVoiceClient.endClientCall).toHaveBeenCalled();
      expect(clearLocalCall).toHaveBeenCalledWith('CA1');
    });

    it('accepts an incoming WhatsApp call', async () => {
      await expect(actions.joinCall({ callSid: 'wa-1' })).resolves.toEqual({
        callId: 9,
      });
      expect(mocks.whatsapp.acceptIncomingCall).toHaveBeenCalledWith({
        callId: 9,
        sdpOffer: 'offer',
        iceServers: [],
        recordingEnabled: true,
      });
      expect(mocks.callsStore.setCallActive).toHaveBeenCalledWith('wa-1');
    });

    it('has nothing to join for an outbound WhatsApp call', async () => {
      await expect(actions.joinCall({ callSid: 'wa-out' })).resolves.toBeNull();
      expect(mocks.whatsapp.acceptIncomingCall).not.toHaveBeenCalled();
    });

    it('joins a Twilio conference through the device', async () => {
      TwilioVoiceClient.initializeDevice.mockResolvedValue({});
      VoiceAPI.joinConference.mockResolvedValue({ conference_sid: 'CF1' });
      await expect(
        actions.joinCall({ callSid: 'CA1', inboxId: 1, conversationId: 2 })
      ).resolves.toEqual({ conferenceSid: 'CF1' });
      expect(markLocalCall).toHaveBeenCalledWith('CA1');
      expect(TwilioVoiceClient.joinClientCall).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'CF1', callSid: 'CA1' })
      );
    });

    it('stops when the Twilio device cannot start, and passes an empty join answer on', async () => {
      TwilioVoiceClient.initializeDevice.mockResolvedValueOnce(null);
      await expect(actions.joinCall({ callSid: 'CA1' })).resolves.toBeNull();
      TwilioVoiceClient.initializeDevice.mockResolvedValueOnce({});
      VoiceAPI.joinConference.mockResolvedValueOnce(undefined);
      await expect(actions.joinCall({ callSid: 'CA1' })).resolves.toEqual({
        conferenceSid: undefined,
      });
    });

    it('allows only one join at a time', async () => {
      let finish;
      mocks.whatsapp.acceptIncomingCall.mockReturnValue(
        new Promise(resolve => {
          finish = resolve;
        })
      );
      const first = actions.joinCall({ callSid: 'wa-1' });
      await expect(actions.joinCall({ callSid: 'wa-1' })).resolves.toBeNull();
      expect(actions.isJoining.value).toBe(true);
      finish();
      await first;
      expect(actions.isJoining.value).toBe(false);
    });

    describe('join failures', () => {
      // eslint-disable-next-line no-console
      const quiet = () =>
        vi.spyOn(console, 'error').mockImplementation(() => {});

      it('dismisses a call that ended before the accept landed', async () => {
        const log = quiet();
        mocks.whatsapp.acceptIncomingCall.mockRejectedValue({
          response: { status: 409, data: { error: 'Call ended' } },
        });
        await expect(actions.joinCall({ callSid: 'wa-1' })).resolves.toBeNull();
        expect(useAlert).toHaveBeenCalledWith('Call ended');
        expect(markCallDismissed).toHaveBeenCalledWith('wa-1');
        expect(mocks.callsStore.dismissCall).toHaveBeenCalledWith('wa-1');
        expect(clearLocalCall).not.toHaveBeenCalled();
        expect(cleanupWhatsappSession).toHaveBeenCalled();
        log.mockRestore();
      });

      it('tears down the Twilio device after any other error', async () => {
        const log = quiet();
        TwilioVoiceClient.initializeDevice.mockRejectedValue(new Error('net'));
        await actions.joinCall({ callSid: 'CA1' });
        expect(useAlert).toHaveBeenCalledWith('CONTACT_PANEL.CALL_FAILED');
        expect(clearLocalCall).toHaveBeenCalledWith('CA1');
        expect(TwilioVoiceClient.endClientCall).toHaveBeenCalled();
        log.mockRestore();
      });

      it('leaves the Twilio device alone for a failed WhatsApp accept', async () => {
        const log = quiet();
        mocks.whatsapp.acceptIncomingCall.mockRejectedValue(new Error('mic'));
        await actions.joinCall({ callSid: 'wa-1' });
        expect(TwilioVoiceClient.endClientCall).not.toHaveBeenCalled();
        log.mockRestore();
      });
    });

    it.each([
      ['wa-1', () => mocks.whatsapp.rejectIncomingCall, [9]],
      ['wa-out', () => mocks.whatsapp.endActiveCall, [9]],
      [
        'CA1',
        () => VoiceAPI.leaveConference,
        [{ inboxId: 1, conversationId: 2, callSid: 'CA1' }],
      ],
      ['bare', () => TwilioVoiceClient.endClientCall, []],
      ['unknown', () => TwilioVoiceClient.endClientCall, []],
    ])(
      'rejects %s the right way and dismisses it',
      async (sid, target, args) => {
        await actions.rejectIncomingCall(sid);
        expect(target()).toHaveBeenCalledWith(...args);
        expect(markCallDismissed).toHaveBeenCalledWith(sid);
        expect(mocks.callsStore.dismissCall).toHaveBeenCalledWith(sid);
      }
    );

    it('dismisses a call', () => {
      actions.dismissCall('CA1');
      expect(mocks.callsStore.dismissCall).toHaveBeenCalledWith('CA1');
    });
  });

  describe('root session', () => {
    it('seeds ringing calls from loaded conversations, now and as more arrive', async () => {
      mocks.store.getters.getAllConversations = [
        {
          messages: [
            { content_type: 'voice_call', call: { status: 'ringing' } },
            { content_type: 'voice_call', call: { status: 'completed' } },
            { content_type: 'text' },
          ],
        },
        {},
      ];
      mocks.store.getters.getCurrentUserID = 1;
      const { wrapper } = mountSession();
      expect(handleVoiceCallCreated).toHaveBeenCalledTimes(1);

      mocks.store.getters.getAllConversations = [
        ...mocks.store.getters.getAllConversations,
        { messages: [] },
      ];
      await nextTick();
      expect(handleVoiceCallCreated).toHaveBeenCalledTimes(2);
      wrapper.unmount();
    });

    it('seeds nothing before conversations load', () => {
      mocks.store.getters.getAllConversations = undefined;
      const { wrapper } = mountSession();
      expect(handleVoiceCallCreated).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it('attaches page listeners once and removes them with the last user', () => {
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      const first = mountSession();
      const second = mountSession();
      expect(TwilioVoiceClient.addEventListener).toHaveBeenCalledTimes(1);
      second.wrapper.unmount();
      expect(remove).not.toHaveBeenCalledWith('pagehide', expect.anything());
      first.wrapper.unmount();
      expect(remove).toHaveBeenCalledWith('pagehide', expect.any(Function));
      expect(TwilioVoiceClient.removeEventListener).toHaveBeenCalled();
      add.mockRestore();
      remove.mockRestore();
    });

    it('warns before leaving the page only during a call', () => {
      const { wrapper } = mountSession();
      const leave = () => {
        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      };
      expect(leave()).toBe(false);
      mocks.callsStore.hasIncomingCall = true;
      expect(leave()).toBe(true);
      window.dispatchEvent(new Event('pagehide'));
      expect(sendWhatsappTerminateBeacon).toHaveBeenCalled();
      wrapper.unmount();
      expect(leave()).toBe(false);
    });

    it('clears the call when Twilio disconnects', () => {
      const { wrapper } = mountSession();
      const [[, onDisconnect]] = TwilioVoiceClient.addEventListener.mock.calls;
      onDisconnect();
      expect(mocks.callsStore.clearActiveCall).toHaveBeenCalled();
      wrapper.unmount();
      onDisconnect();
    });

    it('times the active call and formats the duration', async () => {
      const { wrapper, api } = mountSession();
      const [timer] = mocks.timers;
      mocks.callsStore.hasActiveCall = true;
      await nextTick();
      expect(timer.start).toHaveBeenCalled();
      timer.onTick(125);
      expect(api().formattedCallDuration.value).toBe('02:05');

      mocks.callsStore.hasActiveCall = false;
      await nextTick();
      expect(timer.stop).toHaveBeenCalled();
      expect(api().formattedCallDuration.value).toBe('00:00');
      expect(api().activeCall.value).toBeNull();
      expect(api().incomingCalls.value).toEqual([]);
      wrapper.unmount();
    });
  });
});
