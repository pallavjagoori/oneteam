/**
 * OneTeam behaviour spec for the 360Dialog WhatsApp channel form.
 *
 * Covers required fields and the E.164 phone format, creating the
 * WhatsApp channel with the API key and a trimmed name, the redirect to
 * agent assignment, the loading state, and the error alert with the
 * server message or the fallback.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import DialogWhatsapp from '../360DialogWhatsapp.vue';

const env = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('../../../../../index', () => ({
  default: { replace: (...args) => env.replace(...args) },
}));

const NextButton = {
  name: 'NextButton',
  props: { isLoading: Boolean, label: String },
  template: '<button type="submit">{{ label }}</button>',
};

const mountForm = (isCreating = false) =>
  mount(DialogWhatsapp, {
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
    `input[placeholder="INBOX_MGMT.ADD.WHATSAPP.${key}.PLACEHOLDER"]`
  );
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};
const fill = async (wrapper, phone = '+15550100') => {
  await field(wrapper, 'INBOX_NAME').setValue(' Sales ');
  await field(wrapper, 'PHONE_NUMBER').setValue(phone);
  await field(wrapper, 'API_KEY').setValue('key');
};

describe('360DialogWhatsapp channel form behaviour', () => {
  beforeEach(() => {
    env.replace = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue({ id: 12 });
  });

  it('shows errors for missing or badly formatted fields', async () => {
    const wrapper = mountForm();
    await submit(wrapper);
    expect(wrapper.findAll('.message')).toHaveLength(3);
    await fill(wrapper, '5550100');
    await submit(wrapper);
    expect(wrapper.findAll('.message')).toHaveLength(1);
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('marks each empty field on blur', async () => {
    const wrapper = mountForm();
    await Promise.all(
      ['INBOX_NAME', 'PHONE_NUMBER', 'API_KEY'].map(key =>
        field(wrapper, key).trigger('blur')
      )
    );
    expect(wrapper.findAll('.message')).toHaveLength(3);
  });

  it('creates the channel and opens agent assignment', async () => {
    const wrapper = mountForm(true);
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(true);
    await fill(wrapper);
    await submit(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createChannel', {
      name: 'Sales',
      channel: {
        type: 'whatsapp',
        phone_number: '+15550100',
        provider_config: { api_key: 'key' },
      },
    });
    expect(env.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 12 },
    });
  });

  it('alerts the server message or the fallback', async () => {
    const wrapper = mountForm();
    await fill(wrapper);
    env.dispatch.mockRejectedValueOnce(new Error('Bad key'));
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Bad key');
    env.dispatch.mockRejectedValueOnce({});
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.ADD.WHATSAPP.API.ERROR_MESSAGE'
    );
  });
});
