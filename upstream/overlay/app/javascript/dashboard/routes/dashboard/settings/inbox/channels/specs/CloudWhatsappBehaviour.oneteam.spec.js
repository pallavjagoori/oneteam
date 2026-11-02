/**
 * OneTeam behaviour spec for creating a WhatsApp Cloud inbox by hand.
 *
 * Covers field validation on blur and submit, creating the channel with
 * the trimmed name and provider config, optionally enabling calling
 * (alerting when that fails), redirecting to the agents step, and the
 * error alerts with and without a server message.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import InboxesAPI from 'dashboard/api/inboxes';
import router from 'dashboard/routes/index';
import CloudWhatsapp from '../CloudWhatsapp.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/inboxes', () => ({
  default: { enableWhatsappCalling: vi.fn() },
}));
vi.mock('dashboard/routes/index', () => ({
  default: { replace: vi.fn() },
}));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled', 'isLoading'],
  template: '<button type="submit">{{ label }}</button>',
};

const mountForm = (dispatch, props = {}) => {
  const store = createStore({
    getters: { 'inboxes/getUIFlags': () => ({ isCreating: false }) },
  });
  store.dispatch = dispatch;
  return mount(CloudWhatsapp, {
    props,
    global: { plugins: [store], stubs: { NextButton } },
  });
};

const fill = async wrapper => {
  const inputs = wrapper.findAll('input');
  await inputs[0].setValue('  Sales  ');
  await inputs[1].setValue('+14155552671');
  await inputs[2].setValue('123');
  await inputs[3].setValue('456');
  await inputs[4].setValue('key');
};

describe('CloudWhatsapp behaviour', () => {
  it('validates fields on blur and blocks an invalid submit', async () => {
    const dispatch = vi.fn();
    const wrapper = mountForm(dispatch);
    await Promise.all(
      wrapper.findAll('input').map(input => input.trigger('blur'))
    );
    expect(wrapper.findAll('.message').map(m => m.text())).toEqual([
      'INBOX_MGMT.ADD.WHATSAPP.INBOX_NAME.ERROR',
      'INBOX_MGMT.ADD.WHATSAPP.PHONE_NUMBER.ERROR',
      'INBOX_MGMT.ADD.WHATSAPP.PHONE_NUMBER_ID.ERROR',
      'INBOX_MGMT.ADD.WHATSAPP.BUSINESS_ACCOUNT_ID.ERROR',
      'INBOX_MGMT.ADD.WHATSAPP.API_KEY.ERROR',
    ]);
    await wrapper.find('form').trigger('submit');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('creates the channel and goes to the agents step', async () => {
    const dispatch = vi.fn().mockResolvedValue({ id: 31 });
    const wrapper = mountForm(dispatch);
    await fill(wrapper);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('inboxes/createChannel', {
      name: 'Sales',
      channel: {
        type: 'whatsapp',
        phone_number: '+14155552671',
        provider: 'whatsapp_cloud',
        provider_config: {
          api_key: 'key',
          phone_number_id: '123',
          business_account_id: '456',
        },
      },
    });
    expect(InboxesAPI.enableWhatsappCalling).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 31 },
    });
  });

  it('enables calling when asked, alerting if that fails', async () => {
    const dispatch = vi.fn().mockResolvedValue({ id: 32 });
    const wrapper = mountForm(dispatch, { enableCallingOnComplete: true });
    await fill(wrapper);
    InboxesAPI.enableWhatsappCalling.mockResolvedValueOnce();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(InboxesAPI.enableWhatsappCalling).toHaveBeenCalledWith(32);
    expect(useAlert).not.toHaveBeenCalled();

    InboxesAPI.enableWhatsappCalling.mockRejectedValueOnce(new Error('x'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.WHATSAPP_CALLING.ENABLE_FAILED'
    );
    expect(router.replace).toHaveBeenCalledTimes(2);
  });

  it('alerts when creating fails', async () => {
    const dispatch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Number in use'))
      .mockRejectedValueOnce({});
    const wrapper = mountForm(dispatch);
    await fill(wrapper);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Number in use');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.ADD.WHATSAPP.API.ERROR_MESSAGE'
    );
    expect(router.replace).not.toHaveBeenCalled();
  });
});
