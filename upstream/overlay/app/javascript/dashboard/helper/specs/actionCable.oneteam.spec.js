import ActionCableConnector from '../actionCable';
import AuthAPI from '../../api/auth';
import DashboardAudioNotificationHelper from '../AudioAlerts/DashboardAudioNotificationHelper';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { emitter } from 'shared/helpers/mitt';
import { useCallsStore } from 'dashboard/stores/calls';
import {
  applyOutboundAnswer,
  armOutboundRecorder,
  handleWhatsappRemoteEnd,
  isLocalWhatsappCall,
} from 'dashboard/composables/useWhatsappCallSession';
import { isLocalCall, markCallDismissed } from 'dashboard/helper/voice';

// Shared with the module under test, so a test can switch impersonation on.
const impersonating = vi.hoisted(() => ({ value: false }));

vi.mock('shared/helpers/mitt', () => ({ emitter: { emit: vi.fn() } }));
vi.mock('dashboard/composables/useImpersonation', () => ({
  useImpersonation: () => ({ isImpersonating: impersonating }),
}));
vi.mock('../../api/auth', () => ({ default: { logout: vi.fn() } }));
vi.mock('../AudioAlerts/DashboardAudioNotificationHelper', () => ({
  default: { onNewMessage: vi.fn(), onConversationBotHandoff: vi.fn() },
}));
vi.mock('dashboard/stores/calls', () => ({ useCallsStore: vi.fn() }));
vi.mock('dashboard/composables/useWhatsappCallSession', () => ({
  applyOutboundAnswer: vi.fn(),
  armOutboundRecorder: vi.fn(),
  handleWhatsappRemoteEnd: vi.fn(),
  isLocalWhatsappCall: vi.fn(() => false),
}));
vi.mock('dashboard/helper/voice', () => ({
  markCallDismissed: vi.fn(),
  isLocalCall: vi.fn(() => false),
}));

describe('ActionCableConnector (OneTeam)', () => {
  let dispatch;
  let getters;
  let cable;
  let calls;

  beforeEach(() => {
    vi.useFakeTimers();
    window.chatwootConfig = { websocketURL: 'wss://example.com' };
    dispatch = vi.fn();
    getters = {
      getCurrentAccountId: 1,
      getCurrentUserAvailability: 'online',
      getConversationById: vi.fn(),
      'accounts/isFeatureEnabledonAccount': vi.fn(() => false),
    };
    calls = {
      calls: [],
      addCall: vi.fn(),
      removeCall: vi.fn(),
      setCallActive: vi.fn(),
    };
    useCallsStore.mockReturnValue(calls);
    cable = ActionCableConnector.init({ dispatch, getters }, 'token');
  });

  afterEach(() => {
    cable.disconnect();
    impersonating.value = false;
    delete window.chatwootConfig;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('connects without a configured websocket URL', () => {
    delete window.chatwootConfig;
    const other = ActionCableConnector.init({ dispatch, getters }, 'token');
    expect(other.events['message.created']).toBe(other.onMessageCreated);
    other.disconnect();
  });

  it('announces connection changes and monitor updates on the event bus', () => {
    cable.onReconnect();
    cable.onDisconnected();
    cable.onMonitorUpdated({ id: 1 });
    expect(emitter.emit.mock.calls).toEqual([
      [BUS_EVENTS.WEBSOCKET_RECONNECT],
      [BUS_EVENTS.WEBSOCKET_DISCONNECT],
      [BUS_EVENTS.MONITOR_UPDATED, { id: 1 }],
    ]);
  });

  it.each([
    ['onMessageUpdated', 'updateMessage'],
    ['onConversationRead', 'updateConversation'],
    ['onContactUpdate', 'contacts/updateContact'],
    ['onNotificationCreated', 'notifications/addNotification'],
    ['onNotificationDeleted', 'notifications/deleteNotification'],
    ['onNotificationUpdated', 'notifications/updateNotification'],
  ])('%s dispatches %s', (handler, action) => {
    cable[handler]({ id: 5 });
    expect(dispatch).toHaveBeenCalledWith(action, { id: 5 });
  });

  it.each([
    ['onConversationCreated', 'addConversation'],
    ['onStatusChange', 'updateConversation'],
  ])('%s dispatches %s and refreshes stats', (handler, action) => {
    cable[handler]({ id: 5 });
    expect(dispatch).toHaveBeenCalledWith(action, { id: 5 });
    expect(emitter.emit).toHaveBeenCalledWith('fetch_conversation_stats');
  });

  it('removes deleted contacts from conversations', () => {
    cable.onContactDelete({ id: 9 });
    expect(dispatch).toHaveBeenCalledWith(
      'contacts/deleteContactThroughConversations',
      9
    );
  });

  describe('presence', () => {
    it('updates contacts, agents and the current user', () => {
      cable.onPresenceUpdate({
        contacts: { 1: 'online' },
        users: { 2: 'busy' },
      });
      expect(dispatch.mock.calls).toEqual([
        ['contacts/updatePresence', { 1: 'online' }],
        ['agents/updatePresence', { 2: 'busy' }],
        ['setCurrentUserAvailability', { 2: 'busy' }],
      ]);
    });

    it('is ignored while impersonating', () => {
      impersonating.value = true;
      cable.onPresenceUpdate({ contacts: {}, users: {} });
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('conversation contact changes', () => {
    it('updates the contact of a known conversation', () => {
      cable.onConversationContactChange({
        id: 3,
        meta: { sender: { name: 'Jo' } },
      });
      expect(dispatch).toHaveBeenCalledWith('updateConversationContact', {
        conversationId: 3,
        name: 'Jo',
      });
    });

    it('copes with missing meta, and ignores payloads without an ID', () => {
      cable.onConversationContactChange({ id: 3, meta: null });
      cable.onConversationContactChange({ id: 3 });
      expect(dispatch).toHaveBeenCalledWith('updateConversationContact', {
        conversationId: 3,
      });
      dispatch.mockClear();
      cable.onConversationContactChange({ meta: {} });
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  it('updates the conversation on assignee changes only when it has an ID', () => {
    cable.onAssigneeChanged({});
    expect(dispatch).not.toHaveBeenCalled();
    cable.onAssigneeChanged({ id: 3 });
    expect(dispatch).toHaveBeenCalledWith('updateConversation', { id: 3 });
    expect(emitter.emit).toHaveBeenCalledWith('fetch_conversation_stats');
  });

  it('adds new messages and updates the conversation activity', () => {
    const data = {
      conversation: { last_activity_at: 100 },
      conversation_id: 3,
    };
    cable.onMessageCreated(data);
    expect(DashboardAudioNotificationHelper.onNewMessage).toHaveBeenCalledWith(
      data
    );
    expect(dispatch).toHaveBeenCalledWith('addMessage', data);
    expect(dispatch).toHaveBeenCalledWith('updateConversationLastActivity', {
      lastActivityAt: 100,
      conversationId: 3,
    });
  });

  it('logs out and reloads on request', () => {
    const reload = vi.fn();
    const { location } = window;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload },
    });
    cable.onLogout();
    cable.onReload();
    expect(AuthAPI.logout).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: location,
    });
  });

  describe('typing', () => {
    const payload = { conversation: { id: 3 }, user: { id: 2 } };

    it('shows typing, and clears it after 30 seconds', () => {
      cable.onTypingOn(payload);
      expect(dispatch).toHaveBeenCalledWith('conversationTypingStatus/create', {
        conversationId: 3,
        user: { id: 2 },
      });
      vi.advanceTimersByTime(30000);
      expect(dispatch).toHaveBeenCalledWith(
        'conversationTypingStatus/destroy',
        {
          conversationId: 3,
          user: { id: 2 },
        }
      );
    });

    it('restarts the timer on repeated typing and stops on typing off', () => {
      cable.onTypingOn(payload);
      cable.onTypingOn(payload);
      cable.onTypingOff(payload);
      expect(cable.CancelTyping[3]).toBeNull();
      vi.advanceTimersByTime(30000);
      expect(
        dispatch.mock.calls.filter(
          ([action]) => action === 'conversationTypingStatus/destroy'
        )
      ).toHaveLength(1);
    });
  });

  describe('mentions', () => {
    it('adds the mention without refetching counts when filtered counts are off', () => {
      cable.onConversationMentioned({ id: 1 });
      expect(dispatch).toHaveBeenCalledWith('addMentions', { id: 1 });
      expect(cable.mentionUnreadCountsFetchTimer).toBeNull();
    });

    it('schedules one refetch while a refetch is already waiting', () => {
      getters['accounts/isFeatureEnabledonAccount'].mockReturnValue(true);
      cable.onConversationMentioned({ id: 1 });
      const timer = cable.mentionUnreadCountsFetchTimer;
      cable.onConversationMentioned({ id: 2 });
      expect(cable.mentionUnreadCountsFetchTimer).toBe(timer);
    });
  });

  describe('account events', () => {
    it('reloads the account silently after enrichment and billing changes', () => {
      cable.onEnrichmentCompleted();
      cable.onBillingUpdated({ account_id: 4 });
      expect(dispatch.mock.calls).toEqual([
        ['accounts/get', { silent: true }],
        ['accounts/get', { accountId: 4, silent: true }],
      ]);
    });

    it('revalidates caches without unread counts when filtered counts are off', () => {
      cable.onCacheInvalidate({
        cache_keys: { label: 1, inbox: 2, team: 3, canned_response: 4 },
      });
      expect(dispatch).toHaveBeenCalledWith('revalidateCannedResponses', {
        newKey: 4,
      });
      expect(dispatch).not.toHaveBeenCalledWith('conversationUnreadCounts/get');
    });
  });

  describe('WhatsApp incoming calls', () => {
    const incoming = {
      provider: 'whatsapp',
      call_id: 'wa1',
      id: 8,
      conversation_id: 3,
      inbox_id: 2,
      sdp_offer: 'offer',
      ice_servers: [],
      caller: { name: 'Jo' },
    };

    it('ignores other providers and agents who are not online', () => {
      cable.onVoiceCallIncoming({ provider: 'twilio' });
      cable.onVoiceCallIncoming(null);
      getters.getCurrentUserAvailability = 'busy';
      cable.onVoiceCallIncoming(incoming);
      expect(calls.addCall).not.toHaveBeenCalled();
    });

    it('rings with recording on unless switched off', () => {
      cable.onVoiceCallIncoming(incoming);
      cable.onVoiceCallIncoming({ ...incoming, recording_enabled: false });
      expect(calls.addCall.mock.calls.map(([c]) => c.recordingEnabled)).toEqual(
        [true, false]
      );
      expect(calls.addCall.mock.calls[0][0]).toMatchObject({
        callSid: 'wa1',
        callId: 8,
        callDirection: 'inbound',
        provider: 'whatsapp',
        sdpOffer: 'offer',
      });
    });
  });

  describe('accepted calls', () => {
    it('ignores events without a provider', () => {
      cable.onVoiceCallAccepted({});
      cable.onVoiceCallAccepted(null);
      expect(markCallDismissed).not.toHaveBeenCalled();
    });

    it('drops the ringing card in other tabs, for both providers', () => {
      cable.onVoiceCallAccepted({
        provider: 'whatsapp',
        id: 8,
        call_id: 'wa1',
      });
      cable.onVoiceCallAccepted({ provider: 'twilio', call_id: 'CA1' });
      expect(isLocalWhatsappCall).toHaveBeenCalledWith(8);
      expect(isLocalCall).toHaveBeenCalledWith('CA1');
      expect(calls.removeCall.mock.calls).toEqual([['wa1'], ['CA1']]);
      expect(markCallDismissed).toHaveBeenCalledTimes(2);
    });

    it('keeps the card in the tab that owns the call', () => {
      isLocalCall.mockReturnValueOnce(true);
      cable.onVoiceCallAccepted({ provider: 'twilio', call_id: 'CA1' });
      expect(calls.removeCall).not.toHaveBeenCalled();
    });
  });

  describe('outbound WhatsApp calls', () => {
    it('applies the SDP answer once the tunnel is ready', async () => {
      await cable.onVoiceCallOutboundConnected({ provider: 'twilio' });
      await cable.onVoiceCallOutboundConnected({ provider: 'whatsapp' });
      expect(applyOutboundAnswer).not.toHaveBeenCalled();

      await cable.onVoiceCallOutboundConnected({
        provider: 'whatsapp',
        id: 8,
        sdp_answer: 'answer',
      });
      expect(applyOutboundAnswer).toHaveBeenCalledWith(8, 'answer');

      applyOutboundAnswer.mockRejectedValueOnce(new Error('late'));
      await expect(
        cable.onVoiceCallOutboundConnected({
          provider: 'whatsapp',
          id: 8,
          sdp_answer: 'answer',
        })
      ).resolves.toBeUndefined();
    });

    it('marks a known call active when the contact answers', () => {
      cable.onVoiceCallOutboundAccepted({ provider: 'twilio' });
      cable.onVoiceCallOutboundAccepted({ provider: 'whatsapp', call_id: 'x' });
      expect(calls.setCallActive).not.toHaveBeenCalled();

      calls.calls = [{ callSid: 'wa1' }];
      cable.onVoiceCallOutboundAccepted({
        provider: 'whatsapp',
        call_id: 'wa1',
      });
      expect(calls.setCallActive).toHaveBeenCalledWith('wa1');
      expect(armOutboundRecorder).toHaveBeenCalled();
    });
  });

  describe('ended calls', () => {
    it('ignores unknown providers', async () => {
      await cable.onVoiceCallEnded({ provider: 'skype' });
      await cable.onVoiceCallEnded(null);
      expect(calls.removeCall).not.toHaveBeenCalled();
    });

    it('removes the call, uploading the recording first in the owning tab', async () => {
      await cable.onVoiceCallEnded({ provider: 'twilio', call_id: 'CA1' });
      await cable.onVoiceCallEnded({
        provider: 'whatsapp',
        id: 8,
        call_id: 'wa1',
      });
      expect(handleWhatsappRemoteEnd).not.toHaveBeenCalled();

      isLocalWhatsappCall.mockReturnValue(true);
      handleWhatsappRemoteEnd.mockRejectedValueOnce(new Error('upload'));
      await cable.onVoiceCallEnded({
        provider: 'whatsapp',
        id: 9,
        call_id: 'wa2',
      });
      expect(handleWhatsappRemoteEnd).toHaveBeenCalledWith(9);
      expect(calls.removeCall.mock.calls).toEqual([['CA1'], ['wa1'], ['wa2']]);
      expect(markCallDismissed).toHaveBeenCalledTimes(3);
    });
  });
});
