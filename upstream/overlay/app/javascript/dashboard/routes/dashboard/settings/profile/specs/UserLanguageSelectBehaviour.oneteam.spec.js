/**
 * OneTeam behaviour spec for the profile interface language picker.
 *
 * Covers listing "use account default" plus the enabled languages,
 * showing the saved preference, choosing a language (saving it and
 * switching the UI locale) and clearing back to the account default.
 * The failure path rethrows from a v-model setter nobody awaits, so it
 * would surface as an unhandled rejection and is left to Chatwoot's own
 * tests.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import UserLanguageSelect from '../UserLanguageSelect.vue';

const locale = ref('en');
const uiSettings = ref({ locale: 'fr' });
const updateUISettings = vi.fn();

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key, locale }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings, updateUISettings }),
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({
    enabledLanguages: [
      { name: 'English', iso_639_1_code: 'en' },
      { name: 'Français', iso_639_1_code: 'fr' },
    ],
  }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ currentAccount: ref({ locale: 'de' }) }),
}));

const FormSelect = {
  name: 'FormSelect',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<select><slot /></select>',
};

const mountPicker = () =>
  mount(UserLanguageSelect, {
    props: { label: 'Language', description: 'Pick one' },
    global: { stubs: { FormSelect } },
  });

describe('UserLanguageSelect behaviour', () => {
  beforeEach(() => {
    locale.value = 'en';
    uiSettings.value = { locale: 'fr' };
    updateUISettings.mockResolvedValue();
  });

  it('lists the default and enabled languages', () => {
    const wrapper = mountPicker();
    expect(wrapper.text()).toContain('Language');
    expect(wrapper.text()).toContain('Pick one');
    expect(wrapper.findComponent(FormSelect).props('modelValue')).toBe('fr');
    const options = wrapper.findAll('option');
    expect(options.map(o => o.text())).toEqual([
      'PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.USE_ACCOUNT_DEFAULT',
      'English',
      'Français',
    ]);
    expect(options[2].element.selected).toBe(true);
  });

  it('shows the default when nothing is saved', () => {
    uiSettings.value = null;
    const wrapper = mountPicker();
    expect(wrapper.findComponent(FormSelect).props('modelValue')).toBe('');
  });

  it('saves a chosen language and applies it', async () => {
    const wrapper = mountPicker();
    await wrapper.findComponent(FormSelect).vm.$emit('update:modelValue', 'en');
    await flushPromises();
    expect(updateUISettings).toHaveBeenCalledWith({ locale: 'en' });
    expect(locale.value).toBe('en');
    expect(useAlert).toHaveBeenCalledWith(
      'PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.UPDATE_SUCCESS'
    );
  });

  it('clears back to the account default', async () => {
    const wrapper = mountPicker();
    await wrapper.findComponent(FormSelect).vm.$emit('update:modelValue', '');
    await flushPromises();
    expect(updateUISettings).toHaveBeenCalledWith({ locale: null });
    expect(locale.value).toBe('de');
    expect(useAlert).toHaveBeenCalledTimes(1);
  });
});
