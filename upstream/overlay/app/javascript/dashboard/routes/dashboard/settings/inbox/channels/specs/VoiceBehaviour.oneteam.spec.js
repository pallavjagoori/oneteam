/**
 * OneTeam behaviour spec for the Twilio voice channel creation page.
 *
 * Covers field validation errors, creating the channel, routing to the
 * agents step, and API error alerts.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { computed } from 'vue';
import Voice from '../Voice.vue';
import { useAlert } from 'dashboard/composables';

const env = vi.hoisted(() => ({ dispatch: null, replace: null }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ replace: env.replace }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
  useMapGetter: () => computed(() => ({ isCreating: false })),
}));

const InputStub = {
  name: 'Input',
  props: ['modelValue', 'message', 'messageType'],
  emits: ['update:modelValue', 'blur'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" />',
};

/**
 * Mounts the page.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = () =>
  mount(Voice, {
    global: {
      stubs: {
        PageHeader: true,
        Input: InputStub,
        NextButton: { template: '<button type="submit" />' },
      },
    },
  });

/**
 * Fills every field of the form.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper mounted page
 * @param {string} phone phone number to enter
 * @returns {Promise<void>}
 */
const fill = async (wrapper, phone) => {
  const inputs = wrapper.findAll('input');
  const values = [phone, 'AC1', 'tok', 'SK1', 'sec'];
  await Promise.all(
    inputs.map((input, index) => input.setValue(values[index]))
  );
};

describe('Voice channel behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn();
    env.replace = vi.fn();
  });

  it('shows errors for every touched empty field', async () => {
    const wrapper = mountPage();
    await Promise.all(
      wrapper.findAll('input').map(input => input.trigger('blur'))
    );
    const messages = wrapper
      .findAllComponents({ name: 'Input' })
      .map(input => input.props('messageType'));
    expect(messages).toEqual(['error', 'error', 'error', 'error', 'error']);
  });

  it('does not submit an invalid form', async () => {
    const wrapper = mountPage();
    await fill(wrapper, '12345');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(
      wrapper.findAllComponents({ name: 'Input' })[0].props('message')
    ).toBe('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.ERROR');
  });

  it('creates the channel and opens the agents step', async () => {
    env.dispatch.mockResolvedValue({ id: 9 });
    const wrapper = mountPage();
    await fill(wrapper, '+14155550100');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/createVoiceChannel', {
      name: 'Voice (+14155550100)',
      voice: {
        phone_number: '+14155550100',
        provider: 'twilio',
        provider_config: {
          account_sid: 'AC1',
          auth_token: 'tok',
          api_key_sid: 'SK1',
          api_key_secret: 'sec',
        },
      },
    });
    expect(env.replace).toHaveBeenCalledWith({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: 9 },
    });
  });

  it.each([
    [{ response: { data: { message: 'Bad sid' } } }, 'Bad sid'],
    [new Error('x'), 'INBOX_MGMT.ADD.VOICE.API.ERROR_MESSAGE'],
  ])('alerts on failure', async (error, message) => {
    env.dispatch.mockRejectedValue(error);
    const wrapper = mountPage();
    await fill(wrapper, '+14155550100');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
  });
});
