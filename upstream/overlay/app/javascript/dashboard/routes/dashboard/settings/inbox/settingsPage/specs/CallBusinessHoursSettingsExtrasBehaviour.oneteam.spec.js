/**
 * OneTeam behaviour spec for the call business hours settings extras.
 *
 * Covers reloading when the inbox changes, an inbox without saved
 * values, the hours-not-enabled and read-by-Twilio notes, the API
 * error message fallback, and saving while a save is running.
 */
import { flushPromises, mount } from '@vue/test-utils';
import CallBusinessHoursSettings from '../CallBusinessHoursSettings.vue';

const env = vi.hoisted(() => ({ dispatch: vi.fn(), alert: vi.fn() }));

vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: env.alert }));

/**
 * Mounts the settings.
 *
 * @param {object} inbox inbox edited
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountSettings = inbox =>
  mount(CallBusinessHoursSettings, {
    props: { inbox },
    global: {
      mocks: { $t: key => key },
      stubs: {
        SettingsToggleSection: {
          name: 'SettingsToggleSection',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<section><slot name="editor" /></section>',
        },
        TextArea: {
          name: 'TextArea',
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<textarea />',
        },
        NextButton: {
          name: 'NextButton',
          emits: ['click'],
          template: '<button class="save" @click="$emit(\'click\')" />',
        },
        Spinner: true,
        Icon: true,
      },
    },
  });

describe('CallBusinessHoursSettings extras', () => {
  beforeEach(() => {
    env.dispatch.mockReset();
    env.alert.mockReset();
  });

  it('reloads the saved values when the inbox changes', async () => {
    const wrapper = mountSettings({ id: 1 });
    const toggle = wrapper.findComponent({ name: 'SettingsToggleSection' });
    expect(toggle.props('modelValue')).toBe(false);

    await wrapper.setProps({
      inbox: {
        id: 2,
        business_hours_calls_enabled: true,
        out_of_hours_call_message: 'Closed',
      },
    });
    expect(toggle.props('modelValue')).toBe(true);
    expect(
      wrapper.findComponent({ name: 'TextArea' }).props('modelValue')
    ).toBe('Closed');
    expect(wrapper.text()).toContain('HOURS_NOT_ENABLED');
    expect(wrapper.text()).toContain('READ_BY_TWILIO');

    await wrapper.setProps({ inbox: { id: 3 } });
    expect(toggle.props('modelValue')).toBe(false);
  });

  it('falls back to the generic error and ignores saves while saving', async () => {
    let fail;
    env.dispatch.mockReturnValue(
      new Promise((_, reject) => {
        fail = reject;
      })
    );
    const wrapper = mountSettings({
      id: 1,
      business_hours_calls_enabled: true,
      working_hours_enabled: true,
      out_of_hours_call_message: 'Closed',
    });
    wrapper
      .findComponent({ name: 'SettingsToggleSection' })
      .vm.$emit('update:modelValue', false);
    wrapper
      .findComponent({ name: 'SettingsToggleSection' })
      .vm.$emit('update:modelValue', false);
    expect(env.dispatch).toHaveBeenCalledTimes(1);
    fail(new Error('down'));
    await flushPromises();
    expect(env.alert).toHaveBeenCalledWith('INBOX_MGMT.EDIT.API.ERROR_MESSAGE');
  });
});
