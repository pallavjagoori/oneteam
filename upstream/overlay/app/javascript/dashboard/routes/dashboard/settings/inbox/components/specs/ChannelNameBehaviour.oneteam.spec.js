/**
 * OneTeam behaviour spec for the readable inbox channel name.
 *
 * Covers mapped channel types, the API channel's custom or default name,
 * Twilio voice, WhatsApp and SMS variants.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import ChannelName from '../ChannelName.vue';

const config = ref({});
vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({ 'globalConfig/get': config }),
}));

const nameOf = props => mount(ChannelName, { props }).text();

describe('ChannelName behaviour', () => {
  it('names each channel', () => {
    config.value = {};
    expect(nameOf({ channelType: 'Channel::Email' })).toBe(
      'INBOX_MGMT.CHANNELS.EMAIL'
    );
    expect(nameOf({ channelType: 'Channel::Api' })).toBe(
      'INBOX_MGMT.CHANNELS.API'
    );
    expect(
      nameOf({ channelType: 'Channel::TwilioSms', voiceEnabled: true })
    ).toBe('INBOX_MGMT.CHANNELS.VOICE');
    expect(
      nameOf({ channelType: 'Channel::TwilioSms', medium: 'whatsapp' })
    ).toBe('INBOX_MGMT.CHANNELS.WHATSAPP');
    expect(nameOf({ channelType: 'Channel::TwilioSms', medium: 'sms' })).toBe(
      'INBOX_MGMT.CHANNELS.TWILIO_SMS'
    );
    config.value = { apiChannelName: 'Custom' };
    expect(nameOf({ channelType: 'Channel::Api' })).toBe('Custom');
  });
});
