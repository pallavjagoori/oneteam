/**
 * OneTeam behaviour spec for the Twilio health console link.
 *
 * The console link follows the sender type, and an unknown sender type
 * falls back to the phone number console page.
 */
import { shallowMount } from '@vue/test-utils';
import TwilioHealth from '../TwilioHealth.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key, te: () => true }),
}));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => text }),
}));

const consoleUrl = type =>
  shallowMount(TwilioHealth, {
    props: { healthData: { status: 'healthy', sender: { type } } },
    global: { mocks: { $t: key => key } },
  }).vm.$.setupState.consoleUrl;

describe('TwilioHealth console link', () => {
  it('uses the console page for the sender type', () => {
    expect(consoleUrl('messaging_service')).toBe(
      'https://console.twilio.com/us1/develop/sms/services'
    );
  });

  it('falls back to the phone number page for unknown senders', () => {
    expect(consoleUrl('short_code')).toBe(
      'https://console.twilio.com/us1/develop/phone-numbers/manage/incoming'
    );
  });
});
