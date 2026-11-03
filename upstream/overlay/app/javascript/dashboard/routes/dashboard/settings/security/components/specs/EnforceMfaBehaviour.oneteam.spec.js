/**
 * OneTeam behaviour spec for the EnforceMfa security setting.
 *
 * Covers reading the account setting, saving with a success alert, the
 * saving spinner and reverting on failure.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import EnforceMfa from '../EnforceMfa.vue';

const account = vi.hoisted(() => ({ current: null, update: null }));

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    currentAccount: account.current,
    updateAccount: account.update,
  }),
}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const ToggleStub = {
  name: 'SettingsToggleSection',
  props: { modelValue: Boolean, hideToggle: Boolean },
  emits: ['update:modelValue'],
  template: '<div><slot name="hiddenToggle" /></div>',
};

/**
 * Mounts EnforceMfa for an account.
 *
 * @param {object|null} value current account
 * @param {Function} update updateAccount mock
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountSetting = (value, update) => {
  account.current = ref(value);
  account.update = update;
  return mount(EnforceMfa, {
    global: {
      stubs: {
        SettingsToggleSection: ToggleStub,
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });
};

describe('EnforceMfa behaviour', () => {
  it('reads the setting and defaults to off', () => {
    expect(
      mountSetting({ settings: { enforce_mfa: true } }, vi.fn())
        .findComponent(ToggleStub)
        .props('modelValue')
    ).toBe(true);
    expect(
      mountSetting(null, vi.fn()).findComponent(ToggleStub).props('modelValue')
    ).toBe(false);
  });

  it('saves the new value with a spinner and success alert', async () => {
    let resolve;
    const update = vi.fn(
      () =>
        new Promise(r => {
          resolve = r;
        })
    );
    const wrapper = mountSetting({ settings: {} }, update);
    wrapper.findComponent(ToggleStub).vm.$emit('update:modelValue', true);
    await wrapper.vm.$nextTick();
    expect(update).toHaveBeenCalledWith({ enforce_mfa: true });
    expect(wrapper.find('.spinner').exists()).toBe(true);
    resolve();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'GENERAL_SETTINGS.FORM.ENFORCE_MFA.API.SUCCESS'
    );
    expect(wrapper.find('.spinner').exists()).toBe(false);
  });

  it('reverts and alerts when saving fails', async () => {
    const update = vi.fn().mockRejectedValue(new Error('no'));
    const wrapper = mountSetting({ settings: { enforce_mfa: false } }, update);
    wrapper.findComponent(ToggleStub).vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(wrapper.findComponent(ToggleStub).props('modelValue')).toBe(false);
    expect(useAlert).toHaveBeenCalledWith(
      'GENERAL_SETTINGS.FORM.ENFORCE_MFA.API.ERROR'
    );
  });

  it('reverts to off when the account has no settings', async () => {
    const update = vi.fn().mockRejectedValue(new Error('no'));
    const wrapper = mountSetting({}, update);
    wrapper.findComponent(ToggleStub).vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(wrapper.findComponent(ToggleStub).props('modelValue')).toBe(false);
  });
});
