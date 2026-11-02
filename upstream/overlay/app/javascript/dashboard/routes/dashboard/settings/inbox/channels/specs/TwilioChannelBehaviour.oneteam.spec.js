/**
 * OneTeam behaviour spec for the legacy Twilio channel form.
 *
 * Covers required-field validation, phone number vs messaging service
 * modes, the optional API key, the create payload (phone number
 * normalised to E.164, trimmed name), the redirect to agent assignment,
 * and API error messages.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import Twilio from '../Twilio.vue';

const env = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('../../../../../index', () => ({
  default: { replace: (...args) => env.replace(...args) },
}));
vi.mock('dashboard/store/utils/api', () => ({
  parseAPIErrorResponse: error => error.apiMessage,
}));

const mountForm = () =>
  mount(Twilio, {
    props: { type: 'sms' },
    global: {
      mocks: {
        $store: {
          getters: { 'inboxes/getUIFlags': { isCreating: false } },
          dispatch: (...args) => env.dispatch(...args),
        },
      },
      stubs: { NextButton: { template: '<button type="submit" />' } },
    },
  });

const field = (wrapper, placeholder) =>
  wrapper.find(`input[placeholder*="${placeholder}"]`);
const checkboxes = wrapper => wrapper.findAll('input[type="checkbox"]');
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('Twilio channel form behaviour', () => {
  beforeEach(() => {
    env.replace = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue({ id: 31 });
  });

  it('requires the basic fields before creating', async () => {
    const wrapper = mountForm();
    await submit(wrapper);
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(wrapper.findAll('label.error').length).toBeGreaterThan(0);
  });

  it('creates a phone number channel', async () => {
    const wrapper = mountForm();
    await field(wrapper, 'CHANNEL_NAME').setValue('  Support line ');
    await field(wrapper, 'PHONE_NUMBER').setValue('+1 (555) 000-1111');
    await field(wrapper, 'ACCOUNT_SID').setValue('AC1');
    await field(wrapper, 'AUTH_TOKEN').setValue('secret');
    await field(wrapper, 'PHONE_NUMBER').trigger('blur');
    expect(wrapper.text()).toContain('INBOX_MGMT.ADD.TWILIO.PHONE_NUMBER.ERROR');
    await field(wrapper, 'PHONE_NUMBER').setValue('+15550001111');
    await submit(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createTwilioChannel', {
      twilio_channel: {
        name: 'Support line',
        medium: 'sms',
        account_sid: 'AC1',
        api_key_sid: '',
        auth_token: 'secret',
        messaging_service_sid: '',
        phone_number: '+15550001111',
      },
    });
    expect(env.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 31 },
    });
  });

  it('creates a messaging service channel with an API key', async () => {
    const wrapper = mountForm();
    await checkboxes(wrapper)[0].setValue(true);
    await checkboxes(wrapper)[1].setValue(true);
    expect(field(wrapper, 'PHONE_NUMBER').exists()).toBe(false);
    await field(wrapper, 'CHANNEL_NAME').setValue('Bulk');
    await field(wrapper, 'MESSAGING_SERVICE_SID').trigger('blur');
    await field(wrapper, 'API_KEY.PLACEHOLDER').trigger('blur');
    await field(wrapper, 'ACCOUNT_SID').trigger('blur');
    await field(wrapper, 'CHANNEL_NAME').trigger('blur');
    await submit(wrapper);
    expect(env.dispatch).not.toHaveBeenCalled();
    await field(wrapper, 'MESSAGING_SERVICE_SID').setValue('MG1');
    await field(wrapper, 'ACCOUNT_SID').setValue('AC1');
    await field(wrapper, 'API_KEY.PLACEHOLDER').setValue('SK1');
    await wrapper.findAll('input').at(-1).setValue('key-secret');
    await submit(wrapper);
    expect(env.dispatch.mock.calls[0][1].twilio_channel).toMatchObject({
      messaging_service_sid: 'MG1',
      api_key_sid: 'SK1',
      auth_token: 'key-secret',
      phone_number: null,
    });
  });

  it('shows API errors or a fallback message', async () => {
    const wrapper = mountForm();
    await field(wrapper, 'CHANNEL_NAME').setValue('Line');
    await field(wrapper, 'PHONE_NUMBER').setValue('+15550001111');
    await field(wrapper, 'ACCOUNT_SID').setValue('AC1');
    await field(wrapper, 'AUTH_TOKEN').setValue('secret');
    env.dispatch.mockRejectedValueOnce({ apiMessage: 'Invalid credentials' });
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Invalid credentials');
    env.dispatch.mockRejectedValueOnce({});
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('INBOX_MGMT.ADD.TWILIO.API.ERROR_MESSAGE');
    expect(env.replace).not.toHaveBeenCalled();
  });
});
