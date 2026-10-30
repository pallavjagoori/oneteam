import { emitter } from 'shared/helpers/mitt';
import AnalyticsHelper from '../AnalyticsHelper';
import DashboardAudioNotificationHelper from '../AudioAlerts/DashboardAudioNotificationHelper';
import {
  initializeAnalyticsEvents,
  initializeAudioAlerts,
  initializeChatwootEvents,
} from '../scriptHelpers';
import {
  ANALYTICS_IDENTITY,
  CHATWOOT_RESET,
  CHATWOOT_SET_USER,
} from '../../constants/appEvents';

vi.mock('../AnalyticsHelper', () => ({
  default: { init: vi.fn(), identify: vi.fn() },
}));
vi.mock('../AudioAlerts/DashboardAudioNotificationHelper', () => ({
  default: { set: vi.fn() },
}));

describe('scriptHelpers (OneTeam)', () => {
  afterEach(() => {
    emitter.all.clear();
    delete window.$chatwoot;
  });

  it('starts analytics and identifies users on request', () => {
    initializeAnalyticsEvents();
    expect(AnalyticsHelper.init).toHaveBeenCalled();
    emitter.emit(ANALYTICS_IDENTITY, { user: { id: 1 } });
    expect(AnalyticsHelper.identify).toHaveBeenCalledWith({ id: 1 });
  });

  it('applies the user audio settings', () => {
    initializeAudioAlerts({
      ui_settings: {
        always_play_audio_alert: true,
        enable_audio_alerts: 'mine',
        alert_if_unread_assigned_conversation_exist: true,
        notification_tone: 'bell',
      },
    });
    expect(DashboardAudioNotificationHelper.set).toHaveBeenCalledWith(
      expect.objectContaining({
        audioAlertType: 'mine',
        audioAlertTone: 'bell',
        alwaysPlayAudioAlert: true,
        alertIfUnreadConversationExist: true,
      })
    );
  });

  it('falls back to silent defaults without a user or settings', () => {
    initializeAudioAlerts(undefined);
    expect(DashboardAudioNotificationHelper.set).toHaveBeenLastCalledWith({
      currentUser: undefined,
      audioAlertType: 'none',
      audioAlertTone: 'ding',
      alwaysPlayAudioAlert: false,
      alertIfUnreadConversationExist: false,
    });
  });

  it('ignores the support widget events when the widget is not loaded', () => {
    initializeChatwootEvents();
    emitter.emit(CHATWOOT_RESET);
    emitter.emit(CHATWOOT_SET_USER, { user: { ui_settings: {} } });
    expect(DashboardAudioNotificationHelper.set).toHaveBeenCalled();
  });

  it('resets and identifies the user in the support widget', () => {
    window.$chatwoot = {
      reset: vi.fn(),
      setUser: vi.fn(),
      setCustomAttributes: vi.fn(),
    };
    initializeChatwootEvents();
    emitter.emit(CHATWOOT_RESET);
    expect(window.$chatwoot.reset).toHaveBeenCalled();

    const user = {
      email: 'jo@example.com',
      avatar_url: 'a.png',
      hmac_identifier: 'h',
      name: 'Jo',
      created_at: 't',
      account_id: 1,
    };
    emitter.emit(CHATWOOT_SET_USER, { user });
    expect(window.$chatwoot.setUser).toHaveBeenCalledWith('jo@example.com', {
      avatar_url: 'a.png',
      email: 'jo@example.com',
      identifier_hash: 'h',
      name: 'Jo',
    });
    expect(window.$chatwoot.setCustomAttributes).toHaveBeenCalledWith({
      signedUpAt: 't',
      cloudCustomer: 'true',
      account_id: 1,
    });
  });
});
