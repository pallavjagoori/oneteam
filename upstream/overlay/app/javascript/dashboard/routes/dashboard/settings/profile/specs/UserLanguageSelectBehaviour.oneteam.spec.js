/**
 * OneTeam behaviour spec for the profile language select.
 *
 * Covers picking a supported language, falling back to the account default,
 * and rejecting unknown or failed updates with an error alert.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import UserLanguageSelect from '../UserLanguageSelect.vue';

const env = vi.hoisted(() => ({
  update: vi.fn(),
  alert: vi.fn(),
  locale: null,
}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key, locale: env.locale }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({
    enabledLanguages: [{ name: 'Deutsch', iso_639_1_code: 'de' }],
  }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ currentAccount: ref({ locale: 'fr' }) }),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    updateUISettings: (...args) => env.update(...args),
    uiSettings: ref({ locale: 'de' }),
  }),
}));

const FormSelect = {
  name: 'FormSelect',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<select><slot /></select>',
};

const mountSelect = () => {
  env.locale = ref('en');
  return mount(UserLanguageSelect, { global: { stubs: { FormSelect } } });
};

describe('UserLanguageSelect behaviour', () => {
  it('applies a supported language and the account default', async () => {
    const wrapper = mountSelect();
    expect(wrapper.findAll('option')).toHaveLength(2);
    wrapper.getComponent(FormSelect).vm.$emit('update:modelValue', 'de');
    await flushPromises();
    expect(env.update).toHaveBeenCalledWith({ locale: 'de' });
    expect(env.locale.value).toBe('de');
    wrapper.getComponent(FormSelect).vm.$emit('update:modelValue', '');
    await flushPromises();
    expect(env.update).toHaveBeenLastCalledWith({ locale: null });
    expect(env.locale.value).toBe('fr');
  });

  it('alerts and rethrows for an unknown code or a failed save', async () => {
    const wrapper = mountSelect();
    const { updateLanguage } = wrapper.vm.$.setupState;
    await expect(updateLanguage('xx')).rejects.toThrow('Invalid language code');
    env.update.mockRejectedValueOnce(new Error('offline'));
    await expect(updateLanguage('de')).rejects.toThrow('offline');
    expect(env.alert).toHaveBeenCalledWith(
      'PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.UPDATE_ERROR'
    );
  });
});
