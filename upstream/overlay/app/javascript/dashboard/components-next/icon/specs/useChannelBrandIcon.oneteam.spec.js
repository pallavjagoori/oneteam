/**
 * OneTeam spec for useChannelBrandIcon: the coloured brand logo for an
 * inbox, by channel type, email provider and Twilio medium.
 */
import { ref } from 'vue';
import { useChannelBrandIcon } from '../provider';

const icon = inbox => useChannelBrandIcon(inbox).value;

describe('useChannelBrandIcon', () => {
  it('uses the channel type logo', () => {
    expect(icon({ channel_type: 'Channel::Telegram' })).toBe(
      'i-logos-telegram'
    );
    expect(icon(ref({ channel_type: 'Channel::Whatsapp' }))).toBe(
      'i-logos-whatsapp-icon'
    );
  });

  it('uses the provider logo for Gmail and Outlook inboxes only', () => {
    expect(icon({ channel_type: 'Channel::Email', provider: 'google' })).toBe(
      'i-logos-google-gmail'
    );
    expect(
      icon({ channel_type: 'Channel::Email', provider: 'microsoft' })
    ).toBe('i-woot-outlook-color');
    expect(
      icon({ channel_type: 'Channel::Email', provider: 'imap' })
    ).toBeNull();
    expect(icon({ channel_type: 'Channel::Email' })).toBeNull();
  });

  it('shows the WhatsApp logo for Twilio WhatsApp and nothing for Twilio SMS', () => {
    expect(
      icon({ channel_type: 'Channel::TwilioSms', medium: 'whatsapp' })
    ).toBe('i-logos-whatsapp-icon');
    expect(
      icon({ channel_type: 'Channel::TwilioSms', medium: 'sms' })
    ).toBeNull();
  });
});
