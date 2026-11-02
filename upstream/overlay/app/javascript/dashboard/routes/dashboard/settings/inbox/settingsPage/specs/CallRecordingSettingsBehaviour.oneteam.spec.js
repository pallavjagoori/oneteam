/**
 * OneTeam behaviour spec for a voice inbox's call recording settings.
 *
 * Covers the default on state and reading off values from the inbox,
 * following inbox changes, hiding transcription when recording is off,
 * saving each toggle (API call, inbox reload and success alert), rolling
 * back on failure with an error alert, and ignoring toggles while a save
 * is running.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import InboxesAPI from 'dashboard/api/inboxes';
import { useAlert } from 'dashboard/composables';
import CallRecordingSettings from '../CallRecordingSettings.vue';

vi.mock('dashboard/api/inboxes', () => ({
  default: { setCallRecording: vi.fn() },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const SettingsToggleSection = {
  name: 'SettingsToggleSection',
  props: { modelValue: Boolean, header: String },
  emits: ['update:modelValue'],
  template: '<div class="toggle">{{ header }}</div>',
};

const mountSettings = inbox => {
  const get = vi.fn();
  const store = createStore({
    modules: { inboxes: { namespaced: true, actions: { get } } },
  });
  const wrapper = mount(CallRecordingSettings, {
    props: { inbox },
    global: { plugins: [store], stubs: { SettingsToggleSection } },
  });
  return { wrapper, get };
};

const toggles = wrapper => wrapper.findAllComponents(SettingsToggleSection);
const values = wrapper => toggles(wrapper).map(t => t.props('modelValue'));

describe('CallRecordingSettings behaviour', () => {
  it('reads the inbox settings and follows changes', async () => {
    const { wrapper } = mountSettings({ id: 3 });
    expect(values(wrapper)).toEqual([true, true]);
    expect(toggles(wrapper)[1].props('header')).toBe(
      'INBOX_MGMT.VOICE_CONFIGURATION.TRANSCRIPTION.LABEL'
    );

    await wrapper.setProps({
      inbox: { id: 3, recording_enabled: true, transcription_enabled: false },
    });
    expect(values(wrapper)).toEqual([true, false]);

    await wrapper.setProps({ inbox: { id: 3, recording_enabled: false } });
    expect(values(wrapper)).toEqual([false]);
  });

  it('saves each toggle and reloads the inbox', async () => {
    InboxesAPI.setCallRecording.mockResolvedValue({});
    const { wrapper, get } = mountSettings({
      id: 3,
      recording_enabled: true,
      transcription_enabled: true,
    });
    await toggles(wrapper)[1].vm.$emit('update:modelValue', false);
    expect(wrapper.classes()).toContain('pointer-events-none');
    await flushPromises();
    expect(InboxesAPI.setCallRecording).toHaveBeenLastCalledWith(3, {
      recordingEnabled: true,
      transcriptionEnabled: false,
    });
    expect(get).toHaveBeenCalledWith(expect.anything(), 3);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.classes()).not.toContain('pointer-events-none');

    await toggles(wrapper)[0].vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(InboxesAPI.setCallRecording).toHaveBeenLastCalledWith(3, {
      recordingEnabled: false,
      transcriptionEnabled: false,
    });
    expect(values(wrapper)).toEqual([false]);
  });

  it('rolls back a failed save and ignores toggles while saving', async () => {
    let reject;
    InboxesAPI.setCallRecording.mockReset();
    InboxesAPI.setCallRecording.mockReturnValueOnce(
      new Promise((_, r) => {
        reject = r;
      })
    );
    const { wrapper } = mountSettings({ id: 3 });
    await toggles(wrapper)[0].vm.$emit('update:modelValue', false);
    expect(values(wrapper)).toEqual([false]);

    await toggles(wrapper)[0].vm.$emit('update:modelValue', true);
    expect(InboxesAPI.setCallRecording).toHaveBeenCalledTimes(1);

    reject(new Error('nope'));
    await flushPromises();
    expect(values(wrapper)).toEqual([true, true]);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.EDIT.API.ERROR_MESSAGE'
    );
  });
});
