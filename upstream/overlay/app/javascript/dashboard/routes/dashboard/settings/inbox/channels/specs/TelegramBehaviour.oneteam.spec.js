/**
 * OneTeam behaviour spec for the Telegram channel form.
 *
 * Covers the required bot token (on blur and on submit), creating the
 * Telegram channel, the redirect to agent assignment, the loading state,
 * and the API error alert with its fallback text.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import Telegram from '../Telegram.vue';

const env = vi.hoisted(() => ({ replace: vi.fn(), dispatch: vi.fn() }));

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
  mount(Telegram, {
    global: {
      mocks: {
        $store: {
          getters: { 'inboxes/getUIFlags': { isCreating } },
          dispatch: (...args) => env.dispatch(...args),
        },
      },
      stubs: { NextButton, PageHeader: true },
    },
  });

const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('Telegram channel form behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.dispatch.mockResolvedValue({ id: 12 });
  });

  it('requires a bot token', async () => {
    const wrapper = mountForm(true);
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(true);
    await wrapper.find('input').trigger('blur');
    expect(wrapper.find('label').classes()).toContain('error');
    await submit(wrapper);
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('creates the channel and moves on to agents', async () => {
    const wrapper = mountForm();
    await wrapper.find('input').setValue('123:abc');
    await submit(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createChannel', {
      channel: { type: 'telegram', bot_token: '123:abc' },
    });
    expect(env.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 12 },
    });
  });

  it('shows the API error or a fallback', async () => {
    const wrapper = mountForm();
    await wrapper.find('input').setValue('123:abc');
    env.dispatch.mockRejectedValueOnce(new Error('Invalid token'));
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Invalid token');
    env.dispatch.mockRejectedValueOnce(new Error(''));
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.ADD.TELEGRAM_CHANNEL.API.ERROR_MESSAGE'
    );
    expect(env.replace).not.toHaveBeenCalled();
  });
});
