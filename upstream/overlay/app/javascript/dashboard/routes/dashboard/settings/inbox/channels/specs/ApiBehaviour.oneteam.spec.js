/**
 * OneTeam behaviour spec for the API channel form.
 *
 * Covers the required name and the optional webhook URL (which must
 * start with "http" when given), creating the API channel with a trimmed
 * name, the redirect to agent assignment, the loading state, and the
 * error alert with the server message or the fallback.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import Api from '../Api.vue';

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
  mount(Api, {
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
    `input[placeholder="INBOX_MGMT.ADD.API_CHANNEL.${key}.PLACEHOLDER"]`
  );
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('Api channel form behaviour', () => {
  beforeEach(() => {
    env.replace = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue({ id: 6 });
  });

  it('validates the name and webhook URL', async () => {
    const wrapper = mountForm();
    await field(wrapper, 'CHANNEL_NAME').trigger('blur');
    expect(wrapper.find('.message').text()).toBe(
      'INBOX_MGMT.ADD.API_CHANNEL.CHANNEL_NAME.ERROR'
    );
    await field(wrapper, 'WEBHOOK_URL').setValue('ftp://acme.io');
    await field(wrapper, 'WEBHOOK_URL').trigger('blur');
    expect(wrapper.findAll('label.error')).toHaveLength(2);
    await submit(wrapper);
    expect(env.dispatch).not.toHaveBeenCalled();

    await field(wrapper, 'WEBHOOK_URL').setValue('');
    expect(wrapper.findAll('label.error')).toHaveLength(1);
  });

  it('creates the channel without or with a webhook', async () => {
    const wrapper = mountForm(true);
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(true);
    await field(wrapper, 'CHANNEL_NAME').setValue(' Backend ');
    await submit(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createChannel', {
      name: 'Backend',
      channel: { type: 'api', webhook_url: '' },
    });
    expect(env.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 6 },
    });

    await field(wrapper, 'WEBHOOK_URL').setValue('https://acme.io/hook');
    await submit(wrapper);
    expect(env.dispatch).toHaveBeenLastCalledWith('inboxes/createChannel', {
      name: 'Backend',
      channel: { type: 'api', webhook_url: 'https://acme.io/hook' },
    });
  });

  it('alerts the server message or the fallback', async () => {
    const wrapper = mountForm();
    await field(wrapper, 'CHANNEL_NAME').setValue('Backend');
    env.dispatch.mockRejectedValueOnce(new Error('Name taken'));
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Name taken');
    env.dispatch.mockRejectedValueOnce({});
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.ADD.API_CHANNEL.API.ERROR_MESSAGE'
    );
    expect(env.replace).not.toHaveBeenCalled();
  });
});
