/**
 * Covers the profile language select's error path: an unknown code or a
 * failed save shows an error alert and rethrows. The happy paths live in
 * UserLanguageSelectBehaviour.oneteam.spec.js.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
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

describe('UserLanguageSelect errors', () => {
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
