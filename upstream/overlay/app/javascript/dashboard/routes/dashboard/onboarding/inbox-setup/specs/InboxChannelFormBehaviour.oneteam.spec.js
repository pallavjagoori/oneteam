/**
 * OneTeam behaviour spec for the onboarding channel credentials form.
 *
 * Covers the Line and Telegram field sets, keeping Connect disabled until
 * every field is filled, creating the channel by button or Enter (with
 * the Line inbox named after the channel), ignoring repeat submits while
 * creating, error alerts with and without a message, and going back.
 */
import { flushPromises, mount } from '@vue/test-utils';
import InboxChannelForm from '../InboxChannelForm.vue';

const env = vi.hoisted(() => ({ dispatch: vi.fn(), alerts: [] }));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));

const Input = {
  name: 'Input',
  props: ['modelValue', 'type', 'id'],
  emits: ['update:modelValue'],
  template: '<input :type="type" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled', 'isLoading'],
  emits: ['click'],
  template: '<button :data-label="label" @click="$emit(\'click\')" />',
};

const mountForm = channel =>
  mount(InboxChannelForm, {
    props: { channel },
    global: { stubs: { Input, NextButton } },
  });
const fill = async (wrapper, value) => {
  await Promise.all(
    wrapper
      .findAllComponents(Input)
      .map(input => input.vm.$emit('update:modelValue', value))
  );
};
const connect = wrapper =>
  wrapper.find('[data-label="ONBOARDING_INBOX_SETUP.CHANNELS_DIALOG.CONNECT"]');

describe('InboxChannelForm behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn().mockResolvedValue();
    env.alerts = [];
  });

  it('creates a Line channel named after the channel', async () => {
    const wrapper = mountForm({ type: 'line', labelKey: 'LINE.TITLE' });
    const inputs = wrapper.findAllComponents(Input);
    expect(inputs.map(input => input.props('type'))).toEqual([
      'text',
      'password',
      'password',
    ]);
    await connect(wrapper).trigger('click');
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(wrapper.findAllComponents(NextButton)[1].props('disabled')).toBe(
      true
    );

    await fill(wrapper, 'x');
    let finish;
    env.dispatch.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await wrapper.trigger('keydown.enter');
    await connect(wrapper).trigger('click');
    finish();
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledTimes(1);
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createChannel', {
      name: 'LINE.TITLE',
      channel: {
        type: 'line',
        line_channel_id: 'x',
        line_channel_secret: 'x',
        line_channel_token: 'x',
      },
    });
    expect(wrapper.emitted('created')).toHaveLength(1);
  });

  it('reports Telegram errors and goes back', async () => {
    const wrapper = mountForm({ type: 'telegram' });
    await fill(wrapper, 'token');
    env.dispatch.mockRejectedValueOnce(new Error('Bad token'));
    await connect(wrapper).trigger('click');
    await flushPromises();
    env.dispatch.mockRejectedValueOnce(null);
    await connect(wrapper).trigger('click');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createChannel', {
      channel: { type: 'telegram', bot_token: 'token' },
    });
    expect(env.alerts).toEqual([
      'Bad token',
      'INBOX_MGMT.ADD.TELEGRAM_CHANNEL.API.ERROR_MESSAGE',
    ]);
    await wrapper
      .find('[data-label="ONBOARDING_INBOX_SETUP.CHANNELS_DIALOG.BACK"]')
      .trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
  });
});
