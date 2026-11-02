/**
 * OneTeam behaviour spec for the "forward to" email channel form.
 *
 * Covers required name and valid email validation (on blur and on
 * submit), creating the email channel with a trimmed name, the redirect
 * to agent assignment, the loading state, and the API error alert with
 * the server message or the fallback.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ForwardToOption from '../ForwardToOption.vue';

const env = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('../../../../../../index', () => ({
  default: { replace: (...args) => env.replace(...args) },
}));

const NextButton = {
  name: 'NextButton',
  props: { isLoading: Boolean, label: String },
  template: '<button type="submit">{{ label }}</button>',
};

const mountForm = (isCreating = false) =>
  mount(ForwardToOption, {
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
    `input[placeholder="INBOX_MGMT.ADD.EMAIL_CHANNEL.${key}.PLACEHOLDER"]`
  );
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('ForwardToOption behaviour', () => {
  beforeEach(() => {
    env.replace = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue({ id: 21 });
  });

  it('validates the name and email', async () => {
    const wrapper = mountForm();
    await field(wrapper, 'CHANNEL_NAME').trigger('blur');
    expect(wrapper.find('.message').text()).toBe(
      'INBOX_MGMT.ADD.EMAIL_CHANNEL.CHANNEL_NAME.ERROR'
    );
    await field(wrapper, 'EMAIL').setValue('not-an-email');
    await field(wrapper, 'EMAIL').trigger('blur');
    expect(wrapper.findAll('label.error')).toHaveLength(2);

    await submit(wrapper);
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('creates the channel and opens agent assignment', async () => {
    const wrapper = mountForm(true);
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(true);
    await field(wrapper, 'CHANNEL_NAME').setValue('  Support ');
    await field(wrapper, 'EMAIL').setValue('help@acme.io');
    await submit(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createChannel', {
      name: 'Support',
      channel: { type: 'email', email: 'help@acme.io' },
    });
    expect(env.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 21 },
    });
  });

  it('alerts the server message or the fallback', async () => {
    const wrapper = mountForm();
    await field(wrapper, 'CHANNEL_NAME').setValue('Support');
    await field(wrapper, 'EMAIL').setValue('help@acme.io');

    env.dispatch.mockRejectedValueOnce(new Error('Email taken'));
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Email taken');

    env.dispatch.mockRejectedValueOnce(null);
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.ADD.EMAIL_CHANNEL.API.ERROR_MESSAGE'
    );
    expect(env.replace).not.toHaveBeenCalled();
  });
});
