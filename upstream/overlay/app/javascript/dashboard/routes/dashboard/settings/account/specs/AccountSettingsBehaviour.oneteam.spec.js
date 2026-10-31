/**
 * OneTeam behaviour spec for the general account settings page.
 *
 * The Vuex getters, UI settings, config and account id are faked.
 * Covers seeding the form when the account is already loaded or
 * arrives later, the app language (user setting first), email feature
 * fields, Captain and cloud-only sections, validation, and saving.
 */
import { reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import AccountSettings from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.uiSettings,
    updateUISettings: vi.fn(),
  }),
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({
    enabledLanguages: [
      { iso_639_1_code: 'fr', name: 'French' },
      { iso_639_1_code: 'en', name: 'English' },
    ],
  }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ accountId: ref(1) }),
}));

const NextInput = {
  name: 'NextInput',
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue', 'blur'],
  template: '<input class="next-input" />',
};
const WithLabel = {
  name: 'WithLabel',
  props: ['name', 'hasError', 'label'],
  template:
    '<div :class="name"><slot /><small><slot name="help" /></small></div>',
};

let wrapper;

const mountPage = async () => {
  wrapper = mount(AccountSettings, {
    global: {
      mocks: { $store: env.store },
      stubs: {
        BaseSettingsHeader: true,
        SectionLayout: { template: '<section><slot /></section>' },
        WithLabel,
        NextInput,
        NextButton: {
          props: ['isLoading'],
          template: '<button type="submit"><slot /></button>',
        },
        AccountId: true,
        BuildInfo: true,
        AccountDelete: { template: '<div class="delete" />' },
        AudioTranscription: { template: '<div class="audio" />' },
        WootLoadingState: { template: '<div class="loading" />' },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const nameInput = () => wrapper.find('.account-name').findComponent(NextInput);
const appLocale = () => wrapper.vm.$root.$i18n.locale;

describe('Account settings behaviour', () => {
  beforeEach(() => {
    env.uiSettings = ref({});
    env.account = {
      id: 1,
      name: 'Acme',
      locale: 'fr',
      domain: 'acme.test',
      support_email: 'help@acme.test',
      features: {
        inbound_emails: true,
        custom_reply_domain: true,
        custom_reply_email: true,
      },
    };
    env.getters = reactive({
      'accounts/getAccount': vi.fn(() => env.account),
      'accounts/getUIFlags': { isFetchingItem: false, isUpdating: false },
      'accounts/isFeatureEnabledonAccount': () => true,
      'globalConfig/isOnChatwootCloud': true,
    });
    env.store = { getters: env.getters, dispatch: vi.fn().mockResolvedValue() };
  });

  afterEach(() => {
    wrapper.vm.$root.$i18n.locale = 'en';
  });

  it('seeds the form from a loaded account', async () => {
    await mountPage();
    expect(nameInput().props('modelValue')).toBe('Acme');
    expect(wrapper.find('select').element.value).toBe('fr');
    expect(wrapper.findAll('option').map(o => o.text())).toEqual([
      'English',
      'French',
    ]);
    expect(appLocale()).toBe('fr');
    expect(wrapper.find('.custom-domain').text()).toContain(
      'GENERAL_SETTINGS.FORM.FEATURES.CUSTOM_EMAIL_DOMAIN_ENABLED'
    );
    expect(wrapper.find('.support-email').exists()).toBe(true);
    expect(wrapper.find('.audio').exists()).toBe(true);
    expect(wrapper.find('.delete').exists()).toBe(true);
  });

  it('prefers the user language and waits for the account to load', async () => {
    env.uiSettings.value = { locale: 'pt' };
    env.getters['accounts/getAccount'] = vi.fn(() => undefined);
    env.getters['accounts/getUIFlags'] = { isFetchingItem: true };
    env.getters['accounts/isFeatureEnabledonAccount'] = () => false;
    env.getters['globalConfig/isOnChatwootCloud'] = false;
    await mountPage();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.find('.loading').exists()).toBe(true);
    expect(wrapper.find('.audio').exists()).toBe(false);

    env.getters['accounts/getUIFlags'] = { isFetchingItem: false };
    env.getters['accounts/getAccount'] = vi.fn(() => env.account);
    await flushPromises();
    expect(nameInput().props('modelValue')).toBe('Acme');
    expect(appLocale()).toBe('pt');
    expect(wrapper.find('.delete').exists()).toBe(false);

    env.getters['accounts/getAccount'] = vi.fn(() => ({}));
    await flushPromises();
    expect(nameInput().props('modelValue')).toBe('Acme');
  });

  it('hides email fields without the features and keeps the default language', async () => {
    env.account = {
      id: 1,
      name: 'Acme',
      locale: '',
      features: { inbound_emails: true },
    };
    await mountPage();
    expect(wrapper.find('.custom-domain').exists()).toBe(false);
    expect(wrapper.find('.support-email').exists()).toBe(false);
    expect(appLocale()).toBe('en');
    env.account = { id: 1, name: 'Acme', locale: 'en', features: null };
    await mountPage();
    expect(wrapper.find('.custom-domain').exists()).toBe(false);
  });

  it('ignores an account that disappears while seeding', async () => {
    env.getters['accounts/getAccount']
      .mockImplementationOnce(() => env.account)
      .mockImplementationOnce(() => undefined);
    await mountPage();
    expect(nameInput().props('modelValue')).toBe('');
  });

  it('validates and saves the account', async () => {
    await mountPage();
    await nameInput().vm.$emit('update:modelValue', '');
    await nameInput().vm.$emit('blur');
    expect(
      wrapper.find('.account-name').findComponent(WithLabel).props('hasError')
    ).toBe(true);
    await wrapper.find('form').trigger('submit');
    expect(useAlert).toHaveBeenLastCalledWith('GENERAL_SETTINGS.FORM.ERROR');
    expect(env.store.dispatch).not.toHaveBeenCalled();

    await nameInput().vm.$emit('update:modelValue', 'Acme Inc');
    await wrapper.find('select').setValue('en');
    await wrapper
      .find('.custom-domain')
      .findComponent(NextInput)
      .vm.$emit('update:modelValue', 'x.test');
    await wrapper
      .find('.support-email')
      .findComponent(NextInput)
      .vm.$emit('update:modelValue', 'a@x.test');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('accounts/update', {
      locale: 'en',
      name: 'Acme Inc',
      domain: 'x.test',
      support_email: 'a@x.test',
    });
    expect(env.account.locale).toBe('en');
    expect(appLocale()).toBe('en');
    expect(useAlert).toHaveBeenLastCalledWith(
      'GENERAL_SETTINGS.UPDATE.SUCCESS'
    );

    env.uiSettings.value = { locale: 'de' };
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(appLocale()).toBe('de');

    env.store.dispatch.mockRejectedValueOnce(new Error('no'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('GENERAL_SETTINGS.UPDATE.ERROR');
  });

  it('rejects an empty language', async () => {
    await mountPage();
    wrapper.vm.locale = '';
    await wrapper.find('form').trigger('submit');
    expect(useAlert).toHaveBeenLastCalledWith('GENERAL_SETTINGS.FORM.ERROR');
  });
});
