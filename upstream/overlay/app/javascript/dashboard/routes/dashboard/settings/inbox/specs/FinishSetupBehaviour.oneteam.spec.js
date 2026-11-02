/**
 * OneTeam behaviour spec for the "inbox created" finish screen.
 *
 * Covers the success message per channel (website widget script,
 * WhatsApp Cloud webhook details with the manual-setup retry, LINE
 * callback, email forwarding), the Bandwidth and Twilio callback URLs,
 * QR codes for SMS, WhatsApp, Messenger and Telegram (including blank
 * identifiers and QR generation failures), regenerating codes when the
 * inbox changes, and the duplicate Instagram inbox banner.
 *
 * Note: `generateQRCodes` returns early when there is no inbox, but its
 * only caller (the inbox watcher) already skips a missing inbox, so that
 * line is unreachable. The template itself cannot render without an
 * inbox.
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import WhatsappChannelAPI from 'dashboard/api/channel/whatsappChannel';
import FinishSetup from '../FinishSetup.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { inbox_id: 4 } }),
}));
vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({
    getters: {
      'inboxes/getInbox': id => env.state.inboxes[id],
      'inboxes/getFacebookInboxByInstagramId': id =>
        id === 'ig-1' ? { id: 9 } : null,
    },
  }),
}));
vi.mock('dashboard/composables/useInbox', async () => {
  const { computed } = await import('vue');
  const flag = name => computed(() => env.state.flags.includes(name));
  return {
    useInbox: () => ({
      isAWhatsAppCloudChannel: flag('whatsappCloud'),
      isAWhatsAppChannel: flag('whatsapp'),
      isASmsInbox: flag('sms'),
      isALineChannel: flag('line'),
      isAnEmailChannel: flag('email'),
      isAFacebookInbox: flag('facebook'),
      isATelegramChannel: flag('telegram'),
      isATwilioChannel: flag('twilio'),
      isATwilioSMSChannel: flag('twilioSms'),
    }),
  };
});
vi.mock('qrcode', () => ({
  default: { toDataURL: (...args) => env.toDataURL(...args) },
}));
vi.mock('dashboard/api/channel/whatsappChannel', () => ({
  default: { setupManualWebhook: vi.fn() },
}));

const EmptyState = {
  name: 'EmptyState',
  props: ['title', 'message', 'buttonText'],
  template: '<div><p class="message">{{ message }}</p><slot /></div>',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'isLoading', 'disabled'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const mountScreen = (inbox, flags = []) => {
  env.state = reactive({ inboxes: { 4: inbox }, flags });
  return mount(FinishSetup, {
    global: {
      config: { errorHandler: error => env.errors.push(error) },
      mocks: { $route: { params: { inbox_id: 4 } } },
      stubs: {
        EmptyState,
        NextButton,
        Button: NextButton,
        RouterLink: { props: ['to'], template: '<a><slot /></a>' },
        DuplicateInboxBanner: { template: '<div class="duplicate" />' },
        EmailInboxFinish: { template: '<div class="email-finish" />' },
        WootCode: {
          props: ['script'],
          template: '<pre class="code">{{ script }}</pre>',
        },
      },
    },
  });
};

const message = wrapper => wrapper.find('.message').text();
const codes = wrapper => wrapper.findAll('.code').map(c => c.text());
const qr = (wrapper, alt) => wrapper.find(`img[alt="${alt}"]`);

describe('FinishSetup behaviour', () => {
  beforeEach(() => {
    env.toDataURL = vi.fn(async url => `qr:${url}`);
    env.errors = [];
    env.warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    env.error = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the widget script for a website inbox', () => {
    const wrapper = mountScreen({ web_widget_script: '<script>w</script>' });
    expect(message(wrapper)).toBe('INBOX_MGMT.FINISH.WEBSITE_SUCCESS');
    expect(codes(wrapper)).toEqual(['<script>w</script>']);
    expect(wrapper.find('.duplicate').exists()).toBe(false);
  });

  it('shows WhatsApp Cloud webhook details and retries manual setup', async () => {
    const inbox = {
      phone_number: 'whatsapp:+15550100',
      callback_webhook_url: 'https://hook',
      provider_config: {
        source: 'manual_setup_v2',
        webhook_verify_token: 'tok',
      },
    };
    const wrapper = mountScreen(inbox, ['whatsappCloud', 'whatsapp']);
    await flushPromises();
    expect(message(wrapper)).toBe(
      'INBOX_MGMT.FINISH.MESSAGE. INBOX_MGMT.ADD.WHATSAPP.API_CALLBACK.SUBTITLE'
    );
    expect(codes(wrapper)).toEqual(['https://hook', 'tok']);
    expect(qr(wrapper, 'WhatsApp QR Code').attributes('src')).toBe(
      'qr:https://wa.me/+15550100'
    );

    let finish;
    WhatsappChannelAPI.setupManualWebhook.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const retry = wrapper.findComponent(NextButton);
    await retry.trigger('click');
    expect(WhatsappChannelAPI.setupManualWebhook).toHaveBeenCalledWith(4);
    expect(retry.props('isLoading')).toBe(true);
    finish();
    await flushPromises();
    expect(retry.props('disabled')).toBe(false);
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.ADD.WHATSAPP.MANUAL_SETUP.VERIFY.RETRY_SUCCESS'
    );

    WhatsappChannelAPI.setupManualWebhook.mockRejectedValueOnce({
      response: { data: { message: 'Bad token' } },
    });
    await retry.trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Bad token');

    WhatsappChannelAPI.setupManualWebhook.mockRejectedValueOnce({});
    await retry.trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.ADD.WHATSAPP.MANUAL_SETUP.VERIFY.RETRY_ERROR'
    );
  });

  it('hides webhook details for embedded signup and skips a blank number', async () => {
    const wrapper = mountScreen(
      { provider_config: { source: 'embedded_signup' } },
      ['whatsappCloud', 'whatsapp']
    );
    await flushPromises();
    expect(message(wrapper)).toBe('INBOX_MGMT.FINISH.MESSAGE');
    expect(codes(wrapper)).toEqual([]);
    expect(env.toDataURL).not.toHaveBeenCalled();

    const cloud = mountScreen({ provider_config: {} }, ['whatsappCloud']);
    expect(cloud.findComponent(NextButton).props('label')).toBe(
      'INBOX_MGMT.FINISH.MORE_SETTINGS'
    );
  });

  it('shows the LINE callback URL', () => {
    const wrapper = mountScreen({ callback_webhook_url: 'https://line' }, [
      'line',
    ]);
    expect(message(wrapper)).toBe(
      'INBOX_MGMT.FINISH.MESSAGE. INBOX_MGMT.ADD.LINE_CHANNEL.API_CALLBACK.SUBTITLE'
    );
    expect(codes(wrapper)).toEqual(['https://line']);
  });

  it('shows email forwarding details only without a provider', () => {
    const forward = mountScreen({}, ['email']);
    expect(message(forward)).toBe('');
    expect(forward.find('.email-finish').exists()).toBe(true);
    const imap = mountScreen({ provider: 'google' }, ['email']);
    expect(message(imap)).toBe('INBOX_MGMT.FINISH.MESSAGE');
    expect(imap.find('.email-finish').exists()).toBe(false);
  });

  it('shows the Bandwidth callback for non-Twilio SMS', () => {
    const wrapper = mountScreen({ callback_webhook_url: 'https://bw' }, [
      'sms',
    ]);
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ADD.SMS.BANDWIDTH.API_CALLBACK.TITLE'
    );
    expect(codes(wrapper)).toEqual(['https://bw']);
  });

  it('shows the Twilio callback and an SMS QR code', async () => {
    const wrapper = mountScreen(
      { phone_number: '+15550100', callback_webhook_url: 'https://tw' },
      ['sms', 'twilio', 'twilioSms']
    );
    await flushPromises();
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.FINISH.TWILIO_CALLBACK_FALLBACK'
    );
    expect(wrapper.text()).not.toContain('BANDWIDTH');
    expect(qr(wrapper, 'INBOX_MGMT.FINISH.SMS_QR_ALT').attributes('src')).toBe(
      'qr:sms:+15550100'
    );

    const voice = mountScreen({ phone_number: '+1', voice_enabled: true }, [
      'twilio',
      'twilioSms',
    ]);
    await flushPromises();
    expect(voice.text()).not.toContain('TWILIO_CALLBACK_FALLBACK');
    expect(qr(voice, 'INBOX_MGMT.FINISH.SMS_QR_ALT').exists()).toBe(false);

    const noNumber = mountScreen({}, ['twilio', 'twilioSms']);
    await flushPromises();
    expect(env.toDataURL).toHaveBeenCalledTimes(1);
    expect(noNumber.find('img').exists()).toBe(false);
  });

  it('warns about a blank SMS number and recovers from QR failures', async () => {
    const blank = mountScreen({ phone_number: '  ' }, ['twilioSms']);
    await flushPromises();
    expect(env.warn).toHaveBeenCalledWith('Invalid identifier for sms QR code');
    expect(blank.find('img').exists()).toBe(false);

    env.toDataURL = vi.fn().mockRejectedValue(new Error('qr'));
    const failed = mountScreen({ page_id: 'acme' }, ['facebook']);
    await flushPromises();
    expect(env.error).toHaveBeenCalledWith(
      'Error generating messenger QR code:',
      expect.any(Error)
    );
    expect(failed.find('img').exists()).toBe(false);
  });

  it('shows Messenger and Telegram QR codes and refreshes them', async () => {
    const wrapper = mountScreen({ page_id: 'acme' }, ['facebook']);
    await flushPromises();
    expect(qr(wrapper, 'Messenger QR Code').attributes('src')).toBe(
      'qr:https://m.me/acme'
    );

    env.state.flags = ['telegram'];
    env.state.inboxes[4] = { bot_name: 'acme_bot' };
    await flushPromises();
    expect(qr(wrapper, 'Telegram QR Code').attributes('src')).toBe(
      'qr:https://t.me/acme_bot'
    );

    expect(mountScreen({}, ['facebook']).find('img').exists()).toBe(false);
    const noBot = mountScreen({}, ['telegram']);
    await flushPromises();
    expect(noBot.find('img').exists()).toBe(false);
  });

  it('skips QR codes when the inbox disappears', async () => {
    mountScreen({ page_id: 'acme' }, ['facebook']);
    await flushPromises();
    env.toDataURL.mockClear();
    env.state.inboxes[4] = undefined;
    await flushPromises();
    expect(env.toDataURL).not.toHaveBeenCalled();
    // The template then reads the missing inbox and fails to render.
    expect(env.errors.length).toBeGreaterThan(0);
  });

  it('suggests the existing Facebook inbox for a duplicate Instagram inbox', () => {
    const duplicate = mountScreen({
      channel_type: 'Channel::Instagram',
      instagram_id: 'ig-1',
    });
    expect(duplicate.find('.duplicate').exists()).toBe(true);
    const other = mountScreen({
      channel_type: 'Channel::Instagram',
      instagram_id: 'ig-2',
    });
    expect(other.find('.duplicate').exists()).toBe(false);
  });
});
