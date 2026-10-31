/**
 * OneTeam behaviour spec for the inbox "Configuration" settings tab.
 *
 * Covers the section shown for each channel (Twilio, LINE, web widget,
 * API, email, WhatsApp manual and embedded signup), and the actions:
 * syncing templates, allowed domains, mobile webview and HMAC flags,
 * updating the WhatsApp API key and reconnecting embedded signup.
 */
import { mount, flushPromises } from '@vue/test-utils';
import ConfigurationPage from '../ConfigurationPage.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/composables/useWhatsappEmbeddedSignup', () => ({
  useWhatsappEmbeddedSignup: () => ({
    runEmbeddedSignup: () => env.signup(),
  }),
}));
vi.mock('dashboard/api/channel/whatsappChannel', () => ({
  default: { reauthorizeWhatsApp: (...args) => env.reauthorize(...args) },
}));

const slot = name => ({
  name,
  props: ['label', 'header', 'modelValue', 'inbox', 'script', 'title'],
  emits: ['update:modelValue'],
  template:
    '<section :data-name="label || header || title"><slot /><slot name="editor" /></section>',
});
const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button :disabled="disabled" @click="$emit(\'click\')"><slot />{{ label }}</button>',
};

const mountPage = async (inbox, { cloud = false } = {}) => {
  env.store = {
    getters: { 'globalConfig/isOnChatwootCloud': cloud },
    dispatch: vi.fn((...args) => env.dispatch(...args)),
  };
  const wrapper = mount(ConfigurationPage, {
    props: { inbox: { id: 9, ...inbox } },
    global: {
      stubs: {
        SettingsFieldSection: slot('SettingsFieldSection'),
        SettingsToggleSection: slot('SettingsToggleSection'),
        SettingsAccordion: slot('SettingsAccordion'),
        ImapSettings: slot('ImapSettings'),
        SmtpSettings: slot('SmtpSettings'),
        HmacSecretKey: slot('HmacSecretKey'),
        WhatsappBusinessManagementToken: slot(
          'WhatsappBusinessManagementToken'
        ),
        WootCode: slot('WootCode'),
        TextArea: {
          name: 'TextArea',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<textarea />',
        },
        WootInput: {
          name: 'WootInput',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<input class="key" />',
        },
        NextButton,
      },
      mocks: { $store: env.store },
    },
  });
  await flushPromises();
  return wrapper;
};

const codes = wrapper =>
  wrapper.findAllComponents({ name: 'WootCode' }).map(c => c.props('script'));
const toggles = wrapper =>
  wrapper.findAllComponents({ name: 'SettingsToggleSection' });
const updates = () =>
  env.store.dispatch.mock.calls.filter(c => c[0] === 'inboxes/updateInbox');
const alerts = () => env.alert.mock.calls.map(c => c[0]);
const OK = 'INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE';
const FAIL = 'INBOX_MGMT.EDIT.API.ERROR_MESSAGE';

describe('Inbox ConfigurationPage behaviour', () => {
  beforeEach(() => {
    env.alert = vi.fn();
    env.dispatch = vi.fn(() => Promise.resolve());
    env.signup = vi.fn();
    env.reauthorize = vi.fn(() => Promise.resolve());
  });

  it('shows the Twilio callback, and template sync for Twilio WhatsApp', async () => {
    let wrapper = await mountPage({
      channel_type: 'Channel::TwilioSms',
      medium: 'sms',
      callback_webhook_url: 'https://cb',
    });
    expect(codes(wrapper)).toEqual(['https://cb']);
    expect(wrapper.find('button').exists()).toBe(false);

    wrapper = await mountPage({
      channel_type: 'Channel::TwilioSms',
      medium: 'whatsapp',
    });
    let finish;
    env.dispatch = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    await wrapper.find('button').trigger('click');
    expect(env.store.dispatch).toHaveBeenCalledWith('inboxes/syncTemplates', 9);
    expect(wrapper.find('button').element.disabled).toBe(true);
    finish();
    await flushPromises();
    expect(wrapper.find('button').element.disabled).toBe(false);
    expect(alerts()).toContain(
      'INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_TEMPLATES_SYNC_SUCCESS'
    );

    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(alerts()).toContain(FAIL);
  });

  it('shows the LINE callback', async () => {
    const wrapper = await mountPage({
      channel_type: 'Channel::Line',
      callback_webhook_url: 'https://line',
    });
    expect(codes(wrapper)).toEqual(['https://line']);
  });

  it('loads web widget defaults without saving them', async () => {
    const wrapper = await mountPage({
      channel_type: 'Channel::WebWidget',
      hmac_mandatory: true,
      selected_feature_flags: ['allow_mobile_webview'],
      allowed_domains: 'a.com',
    });
    expect(
      wrapper.findComponent({ name: 'TextArea' }).props('modelValue')
    ).toBe('a.com');
    expect(toggles(wrapper)[1].props('modelValue')).toBe(true);
    expect(toggles(wrapper)[3].props('modelValue')).toBe(true);
    expect(updates()).toEqual([]);

    // New inbox props reload the defaults, again without saving.
    await wrapper.setProps({
      inbox: { id: 9, channel_type: 'Channel::WebWidget' },
    });
    await flushPromises();
    expect(
      wrapper.findComponent({ name: 'TextArea' }).props('modelValue')
    ).toBe('');
    expect(toggles(wrapper)[1].props('modelValue')).toBe(false);
    expect(toggles(wrapper)[3].props('modelValue')).toBe(false);
    expect(updates()).toEqual([]);
  });

  it('saves sanitised allowed domains', async () => {
    const wrapper = await mountPage({ channel_type: 'Channel::WebWidget' });
    wrapper
      .findComponent({ name: 'TextArea' })
      .vm.$emit('update:modelValue', ' https://a.com/ ,b.com ');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const [, payload] = updates()[0];
    expect(payload.id).toBe(9);
    expect(payload.formData).toBe(false);
    expect(typeof payload.channel.allowed_domains).toBe('string');
    expect(alerts()).toContain(OK);
    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(alerts()).toContain(FAIL);
  });

  it('turns mobile webview on and off', async () => {
    const wrapper = await mountPage({
      channel_type: 'Channel::WebWidget',
      selected_feature_flags: ['other'],
    });
    toggles(wrapper)[1].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(updates().at(-1)[1].channel).toEqual({
      selected_feature_flags: ['other', 'allow_mobile_webview'],
    });
    expect(alerts()).toContain(OK);

    await wrapper.setProps({
      inbox: { id: 9, channel_type: 'Channel::WebWidget' },
    });
    await flushPromises();
    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    toggles(wrapper)[1].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(updates().at(-1)[1].channel).toEqual({
      selected_feature_flags: ['allow_mobile_webview'],
    });
    expect(alerts()).toContain(FAIL);

    await wrapper.setProps({
      inbox: {
        id: 9,
        channel_type: 'Channel::WebWidget',
        selected_feature_flags: ['allow_mobile_webview', 'other'],
      },
    });
    await flushPromises();
    env.dispatch = vi.fn(() => Promise.resolve());
    toggles(wrapper)[1].vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(updates().at(-1)[1].channel).toEqual({
      selected_feature_flags: ['other'],
    });
  });

  it('saves the web widget HMAC requirement', async () => {
    const wrapper = await mountPage({ channel_type: 'Channel::WebWidget' });
    toggles(wrapper)[3].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(updates().at(-1)[1]).toEqual({
      id: 9,
      formData: false,
      channel: { hmac_mandatory: true },
    });
    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    toggles(wrapper)[3].vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(alerts()).toContain(FAIL);
  });

  it('shows the API inbox identifier and saves the HMAC checkbox once', async () => {
    const wrapper = await mountPage({
      channel_type: 'Channel::Api',
      inbox_identifier: 'abc',
    });
    expect(codes(wrapper)).toEqual(['abc']);
    expect(wrapper.findComponent({ name: 'HmacSecretKey' }).exists()).toBe(
      true
    );
    await wrapper.find('#hmacMandatory').setValue(true);
    await flushPromises();
    // The checkbox handler saves; the watcher skips non-widget inboxes.
    expect(updates()).toHaveLength(1);
    expect(updates()[0][1].channel).toEqual({ hmac_mandatory: true });
  });

  it('shows the forwarding address for email inboxes, or a warning', async () => {
    let wrapper = await mountPage({
      channel_type: 'Channel::Email',
      forwarding_enabled: true,
      forward_to_email: 'fwd@x.test',
    });
    expect(codes(wrapper)).toEqual(['fwd@x.test']);
    expect(wrapper.findComponent({ name: 'ImapSettings' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'SmtpSettings' }).exists()).toBe(true);
    wrapper = await mountPage({ channel_type: 'Channel::Email' });
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.SETTINGS_POPUP.FORWARD_EMAIL_NOT_CONFIGURED'
    );
  });

  it('shows nothing for WhatsApp without a provider config or other channels', async () => {
    let wrapper = await mountPage({ channel_type: 'Channel::Whatsapp' });
    expect(wrapper.find('section').exists()).toBe(false);
    wrapper = await mountPage({ channel_type: 'Channel::Telegram' });
    expect(wrapper.find('section').exists()).toBe(false);
  });

  it('updates the API key for manually set up WhatsApp', async () => {
    const wrapper = await mountPage({
      channel_type: 'Channel::Whatsapp',
      provider: 'default',
      provider_config: { api_key: 'old', webhook_verify_token: 'tok' },
    });
    expect(codes(wrapper)).toEqual(['tok', 'old']);
    const [update, sync] = wrapper.findAll('button');
    expect(update.element.disabled).toBe(true);
    wrapper
      .findComponent({ name: 'WootInput' })
      .vm.$emit('update:modelValue', 'new');
    await flushPromises();
    expect(update.element.disabled).toBe(false);
    await update.trigger('click');
    await flushPromises();
    expect(updates().at(-1)[1]).toEqual({
      id: 9,
      formData: false,
      channel: {
        provider_config: {
          api_key: 'new',
          webhook_verify_token: 'tok',
        },
      },
    });
    expect(alerts()).toContain(OK);
    env.dispatch = vi.fn(() => Promise.reject(new Error('x')));
    await update.trigger('click');
    await flushPromises();
    expect(alerts()).toContain(FAIL);
    expect(sync.exists()).toBe(true);
    expect(
      wrapper
        .findComponent({ name: 'WhatsappBusinessManagementToken' })
        .exists()
    ).toBe(false);
  });

  it('reconnects embedded signup WhatsApp on Chatwoot Cloud', async () => {
    const wrapper = await mountPage(
      {
        channel_type: 'Channel::Whatsapp',
        provider: 'whatsapp_cloud',
        provider_config: {
          source: 'embedded_signup',
          webhook_verify_token: 't',
        },
      },
      { cloud: true }
    );
    expect(codes(wrapper)).toEqual(['t']);
    expect(
      wrapper
        .findComponent({ name: 'WhatsappBusinessManagementToken' })
        .exists()
    ).toBe(true);
    const reconnect = wrapper.findAll('button')[0];

    // Closing the Meta popup does nothing.
    env.signup = vi.fn(() => Promise.resolve(null));
    await reconnect.trigger('click');
    await flushPromises();
    expect(env.reauthorize).not.toHaveBeenCalled();
    expect(reconnect.element.disabled).toBe(false);

    let finish;
    env.signup = vi.fn(() => Promise.resolve({ code: 'c', business_id: 'b' }));
    env.reauthorize = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    await reconnect.trigger('click');
    await flushPromises();
    expect(reconnect.element.disabled).toBe(true);
    expect(env.reauthorize).toHaveBeenCalledWith({
      inboxId: 9,
      code: 'c',
      business_id: 'b',
    });
    finish();
    await flushPromises();
    expect(alerts()).toContain(
      'INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_RECONFIGURE_SUCCESS'
    );

    env.signup = vi.fn(() => Promise.reject(new Error('popup blocked')));
    await reconnect.trigger('click');
    await flushPromises();
    expect(alerts()).toContain(
      'INBOX_MGMT.SETTINGS_POPUP.WHATSAPP_RECONFIGURE_ERROR'
    );
  });

  it('hides the business token outside Chatwoot Cloud', async () => {
    const wrapper = await mountPage({
      channel_type: 'Channel::Whatsapp',
      provider: 'whatsapp_cloud',
      provider_config: { source: 'embedded_signup' },
    });
    expect(
      wrapper
        .findComponent({ name: 'WhatsappBusinessManagementToken' })
        .exists()
    ).toBe(false);
    const cloudManual = await mountPage(
      {
        channel_type: 'Channel::Whatsapp',
        provider: 'whatsapp_cloud',
        provider_config: {},
      },
      { cloud: true }
    );
    expect(
      cloudManual
        .findComponent({ name: 'WhatsappBusinessManagementToken' })
        .exists()
    ).toBe(false);
  });

  it('renders with the default empty inbox', async () => {
    const wrapper = mount(ConfigurationPage, {
      global: {
        mocks: {
          $store: { getters: {}, dispatch: vi.fn() },
        },
      },
    });
    await flushPromises();
    expect(wrapper.find('section').exists()).toBe(false);
  });
});
