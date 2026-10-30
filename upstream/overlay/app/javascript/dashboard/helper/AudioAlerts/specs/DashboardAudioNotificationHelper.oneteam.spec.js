import { useAlert } from 'dashboard/composables';
import { DashboardAudioNotificationHelper } from '../DashboardAudioNotificationHelper';
import WindowVisibilityHelper from '../WindowVisibilityHelper';
import { initFaviconSwitcher, showBadgeOnFavicon } from '../faviconHelper';

vi.mock('dashboard/store', () => ({ default: {} }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('../faviconHelper', () => ({
  showBadgeOnFavicon: vi.fn(),
  initFaviconSwitcher: vi.fn(),
}));

describe('DashboardAudioNotificationHelper (OneTeam)', () => {
  let helper;
  let audio;
  let visible;

  beforeEach(() => {
    vi.useFakeTimers();
    audio = { load: vi.fn(), play: vi.fn(() => Promise.resolve()) };
    window.Audio = vi.fn(function FakeAudio(src) {
      audio.src = src;
      return audio;
    });
    helper = new DashboardAudioNotificationHelper({});
    visible = vi
      .spyOn(WindowVisibilityHelper, 'isWindowVisible')
      .mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('needs a store', () => {
    expect(() => new DashboardAudioNotificationHelper()).toThrow(
      'store is required'
    );
  });

  describe('set', () => {
    it('loads the chosen tone and starts the reminder timer', () => {
      vi.spyOn(helper.store, 'hasUnreadConversation').mockReturnValue(true);
      helper.set({
        currentUser: { id: 1 },
        alwaysPlayAudioAlert: false,
        alertIfUnreadConversationExist: true,
        audioAlertType: 'mine+unassigned',
        audioAlertTone: 'bell',
      });
      expect(helper.notificationConfig).toEqual({
        audioAlertType: ['mine', 'unassigned'],
        playAlertOnlyWhenHidden: true,
        alertIfUnreadConversationExist: true,
      });
      expect(audio.src).toBe('/audio/dashboard/bell.mp3');
      expect(audio.load).toHaveBeenCalled();
      expect(initFaviconSwitcher).toHaveBeenCalled();

      vi.advanceTimersByTime(30000);
      expect(audio.play).toHaveBeenCalledTimes(1);
      expect(showBadgeOnFavicon).toHaveBeenCalled();
    });

    it('reuses loaded audio when the tone is unchanged, using the default tone', () => {
      helper.set({ currentUser: { id: 1 }, audioAlertType: 'none' });
      helper.set({ currentUser: { id: 1 }, audioAlertType: 'none' });
      expect(window.Audio).toHaveBeenCalledTimes(1);
      expect(audio.src).toBe('/audio/dashboard/ding.mp3');
      expect(helper.notificationConfig.audioAlertType).toEqual(['none']);
    });

    // Chatwoot bug worth fixing in the port: the default alert type is an
    // array, but set() splits it as a string. Callers always pass a string.
    it('throws when no alert type is given', () => {
      expect(() => helper.set({ currentUser: { id: 1 } })).toThrow(TypeError);
    });

    it('starts no timer when unread reminders are off', () => {
      helper.set({ currentUser: { id: 1 }, audioAlertType: 'all' });
      expect(helper.recurringNotificationTimer).toBeNull();
    });
  });

  describe('recurring reminders', () => {
    it('stays quiet without unread conversations or while visible', () => {
      helper.intializeAudio();
      const unread = vi.spyOn(helper.store, 'hasUnreadConversation');
      unread.mockReturnValue(false);
      helper.executeRecurringNotification();
      unread.mockReturnValue(true);
      visible.mockReturnValue(true);
      helper.executeRecurringNotification();
      expect(audio.play).not.toHaveBeenCalled();
      expect(helper.recurringNotificationTimer).not.toBeNull();
    });

    it('plays while visible when set to always play', () => {
      helper.notificationConfig.playAlertOnlyWhenHidden = false;
      visible.mockReturnValue(true);
      expect(helper.shouldPlayAlert()).toBe(true);
    });
  });

  describe('playAudioAlert', () => {
    it('asks once for sound permission when the browser blocks audio', async () => {
      helper.intializeAudio();
      const blocked = Object.assign(new Error('blocked'), {
        name: 'NotAllowedError',
      });
      audio.play.mockRejectedValue(blocked);
      await helper.playAudioAlert();
      await helper.playAudioAlert();
      expect(useAlert).toHaveBeenCalledTimes(1);
    });

    it('ignores other playback errors', async () => {
      helper.intializeAudio();
      audio.play.mockRejectedValue(new Error('decode'));
      await helper.playAudioAlert();
      expect(useAlert).not.toHaveBeenCalled();
    });
  });

  describe('shouldNotifyOnMessage', () => {
    const message = assigneeId => ({
      conversation: { assignee_id: assigneeId },
    });

    beforeEach(() => {
      helper.currentUser = { id: 1 };
    });

    it.each([
      [['none'], 1, false],
      [['all'], 2, true],
      [['assigned'], 1, true],
      [['mine'], 2, false],
      [['unassigned'], null, true],
      [['unassigned'], 1, false],
      [['notme'], 2, true],
      [['notme'], 1, false],
      [['notme'], null, false],
    ])('with %j and assignee %s returns %s', (types, assignee, expected) => {
      helper.notificationConfig.audioAlertType = types;
      expect(helper.shouldNotifyOnMessage(message(assignee))).toBe(expected);
    });
  });

  describe('triggerAlert', () => {
    beforeEach(() => {
      helper.currentUser = { id: 1 };
      helper.notificationConfig.audioAlertType = ['all'];
      vi.spyOn(helper, 'playAudioAlert').mockResolvedValue();
      vi.spyOn(helper.store, 'hasConversationPermission').mockReturnValue(true);
      vi.spyOn(
        helper.store,
        'isMessageFromCurrentConversation'
      ).mockReturnValue(false);
    });

    it('needs conversation permission and a matching alert type', () => {
      helper.store.hasConversationPermission.mockReturnValue(false);
      helper.triggerAlert({});
      helper.store.hasConversationPermission.mockReturnValue(true);
      helper.notificationConfig.audioAlertType = ['none'];
      helper.triggerAlert({});
      expect(helper.playAudioAlert).not.toHaveBeenCalled();
    });

    it('stays quiet while the conversation is open on screen', () => {
      visible.mockReturnValue(true);
      helper.store.isMessageFromCurrentConversation.mockReturnValue(true);
      helper.triggerAlert({});
      helper.store.isMessageFromCurrentConversation.mockReturnValue(false);
      helper.triggerAlert({});
      expect(helper.playAudioAlert).not.toHaveBeenCalled();
    });

    it('plays while visible when set to always play', () => {
      visible.mockReturnValue(true);
      helper.notificationConfig.playAlertOnlyWhenHidden = false;
      helper.triggerAlert({});
      expect(helper.playAudioAlert).toHaveBeenCalled();
    });

    it('treats a handoff to a bot as unassigned', () => {
      const trigger = vi.spyOn(helper, 'triggerAlert');
      helper.onConversationBotHandoff({
        id: 3,
        meta: { assignee_type: 'AgentBot' },
      });
      helper.onConversationBotHandoff({ id: 4 });
      expect(
        trigger.mock.calls.map(([m]) => m.conversation.assignee_id)
      ).toEqual([null, null]);
    });
  });

  describe('onNewMessage', () => {
    beforeEach(() => {
      helper.currentUser = { id: 1 };
      vi.spyOn(helper, 'triggerAlert').mockImplementation(() => {});
      vi.spyOn(
        helper.store,
        'isMessageFromPendingConversation'
      ).mockReturnValue(false);
    });

    it('skips Captain notes, pending conversations, own and outgoing messages', () => {
      helper.onNewMessage({
        private: true,
        sender: { type: 'captain_assistant' },
      });
      helper.store.isMessageFromPendingConversation.mockReturnValueOnce(true);
      helper.onNewMessage({ message_type: 0 });
      helper.onNewMessage({ message_type: 0, sender: { id: 1 } });
      helper.onNewMessage({ message_type: 1, sender: { id: 2 } });
      expect(helper.triggerAlert).not.toHaveBeenCalled();
    });

    it('alerts on incoming messages and private notes from others', () => {
      helper.onNewMessage({ message_type: 0, sender: { id: 2 } });
      helper.onNewMessage({
        message_type: 1,
        private: true,
        sender: { id: 2 },
      });
      expect(helper.triggerAlert).toHaveBeenCalledTimes(2);
    });
  });
});
