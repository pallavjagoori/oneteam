import {
  INBOX_TYPES,
  getInboxClassByType,
  getInboxIconByType,
  getInboxIdentifier,
  getInboxVoiceIcon,
  getInboxWarningIconClass,
  getReadableInboxByType,
  getVoiceCallIcon,
  getVoiceCallProvider,
  isVoiceCallEnabled,
} from '../inbox';

describe('inbox helper (OneTeam)', () => {
  describe('voice calls', () => {
    it('finds the provider from either key style', () => {
      expect(getVoiceCallProvider(null)).toBeNull();
      expect(
        getVoiceCallProvider({ channel_type: INBOX_TYPES.TWILIO })
      ).toBeNull();
      expect(
        getVoiceCallProvider({
          channel_type: INBOX_TYPES.TWILIO,
          voice_enabled: true,
        })
      ).toBe('twilio');
      expect(
        getVoiceCallProvider({
          channelType: INBOX_TYPES.WHATSAPP,
          voiceEnabled: true,
        })
      ).toBe('whatsapp');
      expect(
        getVoiceCallProvider({
          channelType: INBOX_TYPES.WEB,
          voiceEnabled: true,
        })
      ).toBeNull();
      expect(isVoiceCallEnabled({ channel_type: INBOX_TYPES.WEB })).toBe(false);
    });

    it('picks the call icon, defaulting to Twilio', () => {
      expect(getVoiceCallIcon('whatsapp')).toBe('i-woot-whatsapp-voice');
      expect(getVoiceCallIcon('other')).toBe('i-woot-voice-call');
      expect(getInboxVoiceIcon(INBOX_TYPES.WHATSAPP)).toBe(
        'i-woot-whatsapp-voice'
      );
      expect(getInboxVoiceIcon(INBOX_TYPES.TWILIO, 'whatsapp')).toBe(
        'i-woot-whatsapp-voice'
      );
      expect(getInboxVoiceIcon(INBOX_TYPES.TWILIO, 'sms')).toBe(
        'i-woot-voice-call'
      );
      expect(getInboxIconByType(INBOX_TYPES.TWILIO, 'sms', 'fill', true)).toBe(
        'i-woot-voice-call'
      );
    });
  });

  it('picks inbox icons, with WhatsApp for Twilio WhatsApp and a default', () => {
    expect(getInboxIconByType(INBOX_TYPES.TWILIO, 'whatsapp')).toBe(
      'i-ri-whatsapp-fill'
    );
    expect(getInboxIconByType('Channel::Unknown')).toBe('i-ri-chat-1-fill');
    expect(getInboxIconByType('Channel::Unknown', null, 'line')).toBe(
      'i-ri-chat-1-line'
    );
  });

  it('warns only for Facebook and email inboxes that need re-authorising', () => {
    expect(getInboxWarningIconClass(INBOX_TYPES.EMAIL, true)).toBe('warning');
    expect(getInboxWarningIconClass(INBOX_TYPES.EMAIL, false)).toBe('');
    expect(getInboxWarningIconClass(INBOX_TYPES.WEB, true)).toBe('');
  });

  it.each([
    [{ channel_type: INBOX_TYPES.SMS, phone_number: '+1' }, '+1'],
    [{ channel_type: INBOX_TYPES.LINE, line_channel_id: 'L1' }, 'L1'],
    [{ channel_type: INBOX_TYPES.API, inbox_identifier: 'api1' }, 'api1'],
    [{ channel_type: INBOX_TYPES.TWILIO, phone_number: 'whatsapp:+1' }, '+1'],
    [{ channel_type: INBOX_TYPES.TWILIO, messaging_service_sid: 'MG1' }, 'MG1'],
    [{ channel_type: INBOX_TYPES.TWILIO }, ''],
    [{ channel_type: INBOX_TYPES.TELEGRAM }, ''],
    [{ channel_type: INBOX_TYPES.TELEGRAM, bot_name: '@bot' }, '@bot'],
    [{ channel_type: INBOX_TYPES.TELEGRAM, bot_name: 'bot' }, '@bot'],
    [{ channel_type: INBOX_TYPES.FB }, ''],
    [undefined, ''],
  ])('identifies %o as %s', (inbox, identifier) => {
    expect(getInboxIdentifier(inbox)).toBe(identifier);
  });

  it.each([
    [INBOX_TYPES.WEB, undefined, 'livechat', 'globe-desktop'],
    [INBOX_TYPES.WHATSAPP, undefined, 'whatsapp', 'brand-whatsapp'],
    [INBOX_TYPES.EMAIL, undefined, 'email', 'mail'],
    [INBOX_TYPES.TWILIO, 'whatsapp:+1', 'whatsapp', 'brand-whatsapp'],
    ['Channel::Unknown', undefined, 'chat', 'chat'],
    [INBOX_TYPES.FB, undefined, 'facebook', 'brand-facebook'],
    [INBOX_TYPES.TWITTER, undefined, 'twitter', 'brand-twitter'],
    [INBOX_TYPES.TWILIO, undefined, 'sms', 'brand-sms'],
    [INBOX_TYPES.API, undefined, 'api', 'cloud'],
    [INBOX_TYPES.TELEGRAM, undefined, 'telegram', 'brand-telegram'],
    [INBOX_TYPES.LINE, undefined, 'line', 'brand-line'],
    [INBOX_TYPES.INSTAGRAM, undefined, 'chat', 'brand-instagram'],
    [INBOX_TYPES.TIKTOK, undefined, 'chat', 'brand-tiktok'],
  ])('names %s inboxes', (type, phone, readable, className) => {
    expect(getReadableInboxByType(type, phone)).toBe(readable);
    expect(getInboxClassByType(type, phone)).toBe(className);
  });
});
