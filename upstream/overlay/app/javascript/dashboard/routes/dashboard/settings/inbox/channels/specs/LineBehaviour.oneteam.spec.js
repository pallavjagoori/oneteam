/**
 * OneTeam behaviour spec for the LINE channel form.
 *
 * Covers required-field validation (on blur and on submit), creating the
 * LINE channel with its credentials and a trimmed name, the redirect to
 * agent assignment, the loading state, and the API error alert.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import Line from '../Line.vue';

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
  mount(Line, {
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
    `input[placeholder="INBOX_MGMT.ADD.LINE_CHANNEL.${key}.PLACEHOLDER"]`
  );
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};
const keys = [
  'CHANNEL_NAME',
  'LINE_CHANNEL_ID',
  'LINE_CHANNEL_SECRET',
  'LINE_CHANNEL_TOKEN',
];

describe('Line channel form behaviour', () => {
  beforeEach(() => {
    env.replace = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue({ id: 8 });
  });

  it('marks empty fields on blur and blocks submit', async () => {
    const wrapper = mountForm();
    await Promise.all(keys.map(key => field(wrapper, key).trigger('blur')));
    expect(wrapper.findAll('label.error')).toHaveLength(4);
    expect(wrapper.find('.message').text()).toBe(
      'INBOX_MGMT.ADD.LINE_CHANNEL.CHANNEL_NAME.ERROR'
    );
    await submit(wrapper);
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('creates the channel and opens agent assignment', async () => {
    const wrapper = mountForm(true);
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(true);
    await field(wrapper, 'CHANNEL_NAME').setValue(' Line ');
    await field(wrapper, 'LINE_CHANNEL_ID').setValue('id');
    await field(wrapper, 'LINE_CHANNEL_SECRET').setValue('secret');
    await field(wrapper, 'LINE_CHANNEL_TOKEN').setValue('token');
    await submit(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createChannel', {
      name: 'Line',
      channel: {
        type: 'line',
        line_channel_id: 'id',
        line_channel_secret: 'secret',
        line_channel_token: 'token',
      },
    });
    expect(env.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 8 },
    });

    env.dispatch.mockRejectedValueOnce(new Error('nope'));
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith(
      'INBOX_MGMT.ADD.LINE_CHANNEL.API.ERROR_MESSAGE'
    );
    expect(env.replace).toHaveBeenCalledTimes(1);
  });
});
