/**
 * OneTeam behaviour spec for the Bandwidth SMS channel form.
 *
 * Covers required-field and "+" prefix validation (on blur and on
 * submit), the create payload with the Bandwidth credentials and trimmed
 * name, the redirect to agent assignment, the loading state, and the API
 * error alert.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import BandwidthSms from '../BandwidthSms.vue';

const env = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('../../../../../index', () => ({
  default: { replace: (...args) => env.replace(...args) },
}));

const NextButton = {
  name: 'NextButton',
  props: ['isLoading', 'label'],
  template: '<button type="submit">{{ label }}</button>',
};

const mountForm = (isCreating = false) =>
  mount(BandwidthSms, {
    global: {
      mocks: {
        $store: {
          getters: { 'inboxes/getUIFlags': { isCreating } },
          dispatch: (...args) => env.dispatch(...args),
        },
      },
      stubs: { NextButton, Button: NextButton },
    },
  });

const field = (wrapper, key) =>
  wrapper.find(
    `input[placeholder="INBOX_MGMT.ADD.SMS.BANDWIDTH.${key}.PLACEHOLDER"]`
  );
const errors = wrapper => wrapper.findAll('.message').map(e => e.text());
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};
const fill = async (wrapper, phone = '+15550100') => {
  await field(wrapper, 'INBOX_NAME').setValue('  Texts ');
  await field(wrapper, 'PHONE_NUMBER').setValue(phone);
  await field(wrapper, 'ACCOUNT_ID').setValue('acc');
  await field(wrapper, 'APPLICATION_ID').setValue('app');
  await field(wrapper, 'API_KEY').setValue('key');
  await field(wrapper, 'API_SECRET').setValue('secret');
};

describe('BandwidthSms channel form behaviour', () => {
  beforeEach(() => {
    env.replace = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue({ id: 31 });
  });

  it('flags each field on blur and blocks an empty form', async () => {
    const wrapper = mountForm(true);
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(true);
    const keys = [
      'INBOX_NAME',
      'PHONE_NUMBER',
      'ACCOUNT_ID',
      'APPLICATION_ID',
      'API_KEY',
      'API_SECRET',
    ];
    await Promise.all(keys.map(key => field(wrapper, key).trigger('blur')));
    expect(errors(wrapper)).toEqual(
      keys.map(key => `INBOX_MGMT.ADD.SMS.BANDWIDTH.${key}.ERROR`)
    );
    expect(wrapper.findAll('label.error')).toHaveLength(6);
    await submit(wrapper);
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('needs the phone number to start with a plus sign', async () => {
    const wrapper = mountForm();
    await fill(wrapper, '15550100');
    await submit(wrapper);
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(errors(wrapper)).toEqual([
      'INBOX_MGMT.ADD.SMS.BANDWIDTH.PHONE_NUMBER.ERROR',
    ]);
  });

  it('creates the channel and moves on to agents', async () => {
    const wrapper = mountForm();
    await fill(wrapper);
    await submit(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createChannel', {
      name: 'Texts',
      channel: {
        type: 'sms',
        phone_number: '+15550100',
        provider_config: {
          api_key: 'key',
          api_secret: 'secret',
          application_id: 'app',
          account_id: 'acc',
        },
      },
    });
    expect(env.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 31 },
    });
  });

  it('alerts when the channel cannot be created', async () => {
    env.dispatch.mockRejectedValueOnce(new Error('nope'));
    const wrapper = mountForm();
    await fill(wrapper);
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.ADD.SMS.API.ERROR_MESSAGE'
    );
    expect(env.replace).not.toHaveBeenCalled();
  });
});
