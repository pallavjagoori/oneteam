/**
 * OneTeam behaviour spec for the inbox voice configuration settings.
 *
 * Covers turning voice on and off with and without stored Twilio
 * credentials, which credential fields are asked for, submit button
 * rules, saving and rolling back on errors, the inbound calls toggle,
 * webhook URLs, and syncing state when the inbox prop changes.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import InboxesAPI from 'dashboard/api/inboxes';
import VoiceConfigurationPage from '../VoiceConfigurationPage.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/inboxes', () => ({
  default: { setInboundCalls: vi.fn() },
}));

const Toggle = {
  name: 'SettingsToggleSection',
  props: ['modelValue', 'header', 'hideToggle'],
  emits: ['update:modelValue'],
  template: '<div class="toggle"><slot name="hiddenToggle" /></div>',
};
const NextInput = {
  name: 'NextInput',
  props: ['modelValue', 'label'],
  emits: ['update:modelValue'],
  template: '<input class="next-input" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['disabled', 'isLoading', 'label'],
  emits: ['click'],
  template: '<button class="submit" />',
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

let dispatch;

const mountPage = inbox =>
  mount(VoiceConfigurationPage, {
    props: inbox === undefined ? {} : { inbox: { id: 4, ...inbox } },
    global: {
      mocks: { $t: key => key, $store: { dispatch } },
      stubs: {
        SettingsToggleSection: Toggle,
        SettingsFieldSection: { template: '<section><slot /></section>' },
        NextInput,
        NextButton,
        Spinner: { template: '<i class="spinner" />' },
        CallRecordingSettings: { template: '<div class="recording" />' },
        CallBusinessHoursSettings: { template: '<div class="hours" />' },
        WootCode: { props: ['script'], template: '<code>{{ script }}</code>' },
      },
    },
  });

const toggles = wrapper => wrapper.findAllComponents(Toggle);
const inputLabels = wrapper =>
  wrapper.findAllComponents(NextInput).map(input => input.props('label'));
const button = wrapper => wrapper.findComponent(NextButton);

const ready = {
  voice_enabled: true,
  api_key_sid: 'SK1',
  has_api_key_secret: true,
  account_auth_token_configured: true,
};

describe('VoiceConfigurationPage behaviour', () => {
  beforeEach(() => {
    dispatch = vi.fn().mockResolvedValue();
  });

  it('shows the voice extras when the inbox already has voice', () => {
    const wrapper = mountPage({
      ...ready,
      voice_call_webhook_url: 'https://hooks/voice',
      voice_status_webhook_url: 'https://hooks/status',
    });
    expect(toggles(wrapper)).toHaveLength(2);
    expect(toggles(wrapper)[0].props('modelValue')).toBe(true);
    expect(toggles(wrapper)[1].props('modelValue')).toBe(true);
    expect(wrapper.find('.recording').exists()).toBe(true);
    expect(wrapper.find('.hours').exists()).toBe(true);
    expect(wrapper.findAll('code').map(c => c.text())).toEqual([
      'https://hooks/voice',
      'https://hooks/status',
    ]);
    expect(button(wrapper).exists()).toBe(false);
  });

  it('renders with no inbox at all', () => {
    expect(toggles(mountPage())).toHaveLength(1);
  });

  it('starts off for a plain inbox and hides the extras', () => {
    const wrapper = mountPage({ inbound_calls_enabled: false });
    expect(toggles(wrapper)).toHaveLength(1);
    expect(toggles(wrapper)[0].props('modelValue')).toBe(false);
    expect(wrapper.vm.inboundCallsEnabled).toBe(false);
    expect(wrapper.vm.isSubmitDisabled).toBe(false);
    expect(wrapper.find('code').exists()).toBe(false);
  });

  it('asks for every credential when none are stored', async () => {
    const wrapper = mountPage({});
    await toggles(wrapper)[0].vm.$emit('update:modelValue', true);
    expect(dispatch).not.toHaveBeenCalled();
    expect(inputLabels(wrapper)).toEqual([
      'INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SID.LABEL',
      'INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SECRET.LABEL',
    ]);
    expect(button(wrapper).props('disabled')).toBe(true);
    const inputs = wrapper.findAllComponents(NextInput);
    await inputs[0].vm.$emit('update:modelValue', 'SK9');
    expect(button(wrapper).props('disabled')).toBe(true);
    await inputs[1].vm.$emit('update:modelValue', 'secret');
    expect(button(wrapper).props('disabled')).toBe(false);

    const save = deferred();
    dispatch.mockReturnValueOnce(save.promise);
    await button(wrapper).vm.$emit('click');
    expect(button(wrapper).props('isLoading')).toBe(true);
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(toggles(wrapper)[0].props('hideToggle')).toBe(true);
    // A second toggle while saving is ignored.
    await toggles(wrapper)[0].vm.$emit('update:modelValue', false);
    expect(wrapper.vm.voiceEnabled).toBe(true);
    save.resolve();
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('inboxes/updateInbox', {
      id: 4,
      formData: false,
      channel: {
        voice_enabled: true,
        api_key_sid: 'SK9',
        api_key_secret: 'secret',
      },
    });
    expect(wrapper.vm.apiKeySecret).toBe('');
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'
    );
  });

  it('asks only for the secret and auth token when the SID is stored', async () => {
    const wrapper = mountPage({ api_key_sid: 'SK1' });
    expect(wrapper.vm.apiKeySid).toBe('SK1');
    await toggles(wrapper)[0].vm.$emit('update:modelValue', true);
    expect(inputLabels(wrapper)).toEqual([
      'INBOX_MGMT.ADD.VOICE.TWILIO.AUTH_TOKEN.LABEL',
      'INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SECRET.LABEL',
    ]);
    expect(button(wrapper).props('disabled')).toBe(true);
    const inputs = wrapper.findAllComponents(NextInput);
    await inputs[0].vm.$emit('update:modelValue', 'token');
    expect(button(wrapper).props('disabled')).toBe(true);
    await inputs[1].vm.$emit('update:modelValue', 'secret');
    expect(button(wrapper).props('disabled')).toBe(false);

    dispatch.mockRejectedValueOnce(new Error('nope'));
    await button(wrapper).vm.$emit('click');
    await flushPromises();
    expect(dispatch.mock.calls[0][1].channel).toEqual({
      voice_enabled: true,
      auth_token: 'token',
      api_key_secret: 'secret',
    });
    expect(useAlert).toHaveBeenCalledWith('INBOX_MGMT.EDIT.API.ERROR_MESSAGE');
    expect(wrapper.vm.voiceEnabled).toBe(false);
    expect(wrapper.vm.isUpdating).toBe(false);
  });

  it('asks only for the auth token when keys are stored but the token is not', async () => {
    const wrapper = mountPage({
      ...ready,
      account_auth_token_configured: false,
    });
    expect(inputLabels(wrapper)).toEqual([
      'INBOX_MGMT.ADD.VOICE.TWILIO.AUTH_TOKEN.LABEL',
    ]);
    expect(button(wrapper).props('disabled')).toBe(true);
    await wrapper.findComponent(NextInput).vm.$emit('update:modelValue', 'tok');
    expect(button(wrapper).props('disabled')).toBe(false);
    await button(wrapper).vm.$emit('click');
    await flushPromises();
    expect(dispatch.mock.calls[0][1].channel).toEqual({
      voice_enabled: true,
      auth_token: 'tok',
    });
    expect(wrapper.vm.authToken).toBe('');
  });

  it('saves straight away when credentials exist and rolls back on failure', async () => {
    const wrapper = mountPage(ready);
    await toggles(wrapper)[0].vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(dispatch.mock.calls[0][1].channel).toEqual({ voice_enabled: false });

    dispatch.mockRejectedValueOnce(new Error('nope'));
    await toggles(wrapper)[0].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(wrapper.vm.voiceEnabled).toBe(false);
  });

  it('toggles inbound calls, ignores repeats and rolls back on failure', async () => {
    const wrapper = mountPage(ready);
    const pending = deferred();
    InboxesAPI.setInboundCalls.mockReturnValueOnce(pending.promise);
    await toggles(wrapper)[1].vm.$emit('update:modelValue', false);
    expect(toggles(wrapper)[1].props('hideToggle')).toBe(true);
    expect(wrapper.find('.spinner').exists()).toBe(true);
    await toggles(wrapper)[1].vm.$emit('update:modelValue', true);
    expect(InboxesAPI.setInboundCalls).toHaveBeenCalledTimes(1);
    pending.resolve();
    await flushPromises();
    expect(InboxesAPI.setInboundCalls).toHaveBeenCalledWith(4, false);
    expect(dispatch).toHaveBeenCalledWith('inboxes/get', 4);
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.vm.inboundCallsEnabled).toBe(false);

    InboxesAPI.setInboundCalls.mockRejectedValueOnce(new Error('nope'));
    await toggles(wrapper)[1].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(wrapper.vm.inboundCallsEnabled).toBe(false);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.EDIT.API.ERROR_MESSAGE'
    );
    expect(wrapper.vm.isTogglingInbound).toBe(false);
  });

  it('follows changes to the inbox', async () => {
    const wrapper = mountPage(ready);
    await wrapper.setProps({
      inbox: {
        id: 4,
        voice_enabled: null,
        api_key_sid: null,
        inbound_calls_enabled: false,
      },
    });
    expect(wrapper.vm.voiceEnabled).toBe(false);
    expect(wrapper.vm.apiKeySid).toBe('');
    expect(wrapper.vm.inboundCallsEnabled).toBe(false);
    await wrapper.setProps({
      inbox: {
        id: 4,
        voice_enabled: true,
        api_key_sid: 'SK2',
        inbound_calls_enabled: true,
      },
    });
    expect(wrapper.vm.voiceEnabled).toBe(true);
    expect(wrapper.vm.apiKeySid).toBe('SK2');
    expect(wrapper.vm.inboundCallsEnabled).toBe(true);
  });
});
