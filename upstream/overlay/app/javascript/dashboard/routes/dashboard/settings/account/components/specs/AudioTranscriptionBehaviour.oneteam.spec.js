/**
 * OneTeam behaviour spec for the audio transcription account setting.
 *
 * Covers reading the switch from account settings (and missing ones),
 * saving the new value with a success alert, and the error alert.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import AudioTranscription from '../AudioTranscription.vue';
import { useAlert } from 'dashboard/composables';

const account = ref(null);
const updateAccount = vi.fn();

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ currentAccount: account, updateAccount }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const Switch = {
  name: 'Switch',
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<input type="checkbox" />',
};
const mountSetting = () =>
  mount(AudioTranscription, {
    global: {
      stubs: {
        Switch,
        SectionLayout: {
          template: '<section><slot name="headerActions" /></section>',
        },
      },
    },
  });

describe('AudioTranscription behaviour', () => {
  it('reads the setting and saves changes', async () => {
    account.value = null;
    const wrapper = mountSetting();
    const toggle = wrapper.findComponent(Switch);
    expect(toggle.props('modelValue')).toBe(false);
    account.value = { settings: { audio_transcriptions: true } };
    await wrapper.vm.$nextTick();
    expect(toggle.props('modelValue')).toBe(true);

    updateAccount.mockResolvedValueOnce().mockRejectedValueOnce(new Error('x'));
    toggle.vm.$emit('update:modelValue', false);
    toggle.vm.$emit('change');
    await flushPromises();
    expect(updateAccount).toHaveBeenCalledWith({ audio_transcriptions: false });
    expect(useAlert).toHaveBeenCalledWith(
      'GENERAL_SETTINGS.FORM.AUDIO_TRANSCRIPTION.API.SUCCESS'
    );
    toggle.vm.$emit('change');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'GENERAL_SETTINGS.FORM.AUDIO_TRANSCRIPTION.API.ERROR'
    );
  });
});
