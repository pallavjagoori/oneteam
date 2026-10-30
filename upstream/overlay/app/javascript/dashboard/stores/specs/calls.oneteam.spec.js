import { createPinia, setActivePinia } from 'pinia';
import TwilioVoiceClient from 'dashboard/api/channel/voice/twilioVoiceClient';
import { cleanupWhatsappSession } from 'dashboard/composables/useWhatsappCallSession';
import { useCallsStore } from '../calls';

vi.mock('dashboard/api/channel/voice/twilioVoiceClient', () => ({
  default: { endClientCall: vi.fn() },
}));
vi.mock('dashboard/composables/useWhatsappCallSession', () => ({
  cleanupWhatsappSession: vi.fn(),
}));

describe('calls store (OneTeam)', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useCallsStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts with no calls', () => {
    expect(store.activeCall).toBeNull();
    expect(store.hasActiveCall).toBe(false);
    expect(store.hasIncomingCall).toBe(false);
  });

  describe('addCall', () => {
    it('ignores calls without a call SID', () => {
      store.addCall(null);
      store.addCall({ conversationId: 1 });
      expect(store.calls).toEqual([]);
    });

    it('puts the newest incoming call first', () => {
      store.addCall({ callSid: 'a' });
      store.addCall({ callSid: 'b' });
      expect(store.incomingCalls.map(c => c.callSid)).toEqual(['b', 'a']);
      expect(store.hasIncomingCall).toBe(true);
    });

    it('merges repeated events, keeping the caller and active state', () => {
      store.addCall({ callSid: 'a', caller: { name: 'Jo' } });
      store.setCallActive('a');
      store.addCall({ callSid: 'a', provider: 'whatsapp', isActive: false });
      expect(store.calls).toEqual([
        {
          callSid: 'a',
          caller: { name: 'Jo' },
          provider: 'whatsapp',
          isActive: true,
        },
      ]);
      store.addCall({ callSid: 'a', caller: { name: 'Sam' } });
      expect(store.activeCall.caller).toEqual({ name: 'Sam' });
    });

    it('takes a caller when none was known', () => {
      store.addCall({ callSid: 'a' });
      store.addCall({ callSid: 'a', caller: { name: 'Jo' } });
      expect(store.calls[0].caller).toEqual({ name: 'Jo' });
    });
  });

  describe('status changes', () => {
    it('ignores calls that are still going', () => {
      store.addCall({ callSid: 'a' });
      store.handleCallStatusChanged({ callSid: 'a', status: 'in-progress' });
      expect(store.calls).toHaveLength(1);
    });

    it('drops ended WhatsApp calls without tearing down the session', () => {
      store.addCall({ callSid: 'a', provider: 'whatsapp' });
      store.setCallActive('a');
      store.handleCallStatusChanged({ callSid: 'a', status: 'completed' });
      expect(store.calls).toEqual([]);
      expect(cleanupWhatsappSession).not.toHaveBeenCalled();
    });

    it('removes ended Twilio calls, ending the active one', () => {
      store.addCall({ callSid: 'a', provider: 'twilio' });
      store.setCallActive('a');
      store.handleCallStatusChanged({ callSid: 'a', status: 'completed' });
      expect(TwilioVoiceClient.endClientCall).toHaveBeenCalled();
      store.handleCallStatusChanged({ callSid: 'unknown', status: 'failed' });
      expect(store.calls).toEqual([]);
    });
  });

  it('only tears down a removed call that is active', () => {
    store.addCall({ callSid: 'a' });
    store.removeCall('a');
    expect(TwilioVoiceClient.endClientCall).not.toHaveBeenCalled();
  });

  it('clears the active call through its provider', () => {
    store.addCall({ callSid: 'a', provider: 'whatsapp' });
    store.addCall({ callSid: 'b' });
    store.setCallActive('a');
    expect(store.hasActiveCall).toBe(true);
    store.clearActiveCall();
    expect(cleanupWhatsappSession).toHaveBeenCalled();
    expect(store.calls.map(c => c.callSid)).toEqual(['b']);

    store.clearActiveCall();
    expect(TwilioVoiceClient.endClientCall).toHaveBeenCalled();
  });

  it('dismisses a call without teardown', () => {
    store.addCall({ callSid: 'a' });
    store.setCallActive('a');
    store.dismissCall('a');
    expect(store.calls).toEqual([]);
    expect(TwilioVoiceClient.endClientCall).not.toHaveBeenCalled();
  });

  it('removes all calls of a conversation, ending the active one', () => {
    store.addCall({ callSid: 'a', conversationId: 1, provider: 'whatsapp' });
    store.addCall({ callSid: 'b', conversationId: 1 });
    store.addCall({ callSid: 'c', conversationId: 2 });
    store.setCallActive('a');
    store.removeCallsForConversation(1);
    expect(cleanupWhatsappSession).toHaveBeenCalledTimes(1);
    expect(store.calls.map(c => c.callSid)).toEqual(['c']);
  });
});
