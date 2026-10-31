/**
 * OneTeam behaviour spec for the onboarding account details step.
 *
 * Account, enrichment, store, router and analytics are faked. Covers
 * the greeting and prefilled details, the company logo choice, language
 * and timezone options, editing the website, blocking submits while
 * enriching or already submitting, the required website check, saving
 * with a normalised URL, then routing to the next step or home, and
 * error handling.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import Onboarding from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => env.account,
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ enabledLanguages: env.languages }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: () => env.user,
}));
vi.mock('../account-details/useAccountEnrichment', () => ({
  useAccountEnrichment: fields => {
    env.fields = fields;
    return env.enrichment;
  },
}));

const Layout = {
  name: 'OnboardingLayout',
  props: ['greeting', 'isLoading', 'disabled'],
  template: '<div><slot /></div>',
};
const Select = {
  name: 'OnboardingFormSelect',
  props: ['modelValue', 'options', 'hasError'],
  emits: ['update:modelValue'],
  template: '<div class="select" />',
};
const InlineInput = {
  name: 'InlineInput',
  props: ['modelValue', 'readonly', 'customInputClass'],
  emits: ['update:modelValue', 'enterPress', 'blur'],
  methods: { focus: () => env.focus(), blur: () => env.blur() },
  template: '<input class="website" />',
};
const NextButton = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button type="button" />',
};

const mountPage = async () => {
  const wrapper = mount(Onboarding, {
    global: {
      stubs: {
        OnboardingLayout: Layout,
        OnboardingSection: { template: '<section><slot /></section>' },
        OnboardingFormRow: { template: '<div><slot /></div>' },
        OnboardingFormSelect: Select,
        InlineInput,
        NextButton,
        Avatar: true,
        Icon: true,
        Spinner: { template: '<i class="spinner" />' },
      },
      directives: { tooltip: {} },
    },
  });
  await flushPromises();
  return wrapper;
};

const selects = wrapper => wrapper.findAllComponents(Select);
const website = wrapper => wrapper.findComponent(InlineInput);
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('Onboarding account details behaviour', () => {
  beforeEach(() => {
    env.router = { push: vi.fn() };
    env.user = ref({ name: 'Ada', email: 'ada@acme.test' });
    env.languages = [
      { iso_639_1_code: 'fr', name: 'French' },
      { iso_639_1_code: 'en', name: 'English' },
    ];
    env.accountData = ref({
      name: 'Acme',
      custom_attributes: {
        brand_info: {
          logos: [
            { url: 'wide.png' },
            { url: 'square.png', resolution: { aspect_ratio: 1 } },
          ],
        },
      },
    });
    env.account = {
      accountId: ref(1),
      currentAccount: env.accountData,
      finishOnboarding: vi.fn(async () => {
        env.accountData.value = {
          ...env.accountData.value,
          custom_attributes: { onboarding_step: env.nextStep },
        };
      }),
    };
    env.nextStep = 'inbox_setup';
    env.enrichment = {
      isEnriching: ref(false),
      getChangedFields: vi.fn(() => ['website']),
    };
    env.store = { dispatch: vi.fn().mockResolvedValue() };
    env.focus = vi.fn();
    env.blur = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('greets the user and prefills account details', async () => {
    const wrapper = await mountPage();
    expect(useTrack).toHaveBeenCalledWith(expect.any(String));
    expect(wrapper.text()).toContain('ada@acme.test');
    expect(wrapper.text()).toContain('Acme');
    expect(wrapper.find('img').attributes('src')).toBe('square.png');
    expect(selects(wrapper)[1].props('options')).toEqual([
      { value: 'en', label: 'English' },
      { value: 'fr', label: 'French' },
    ]);
    expect(selects(wrapper)[2].props('options').length).toBeGreaterThan(0);
    expect(website(wrapper).props('readonly')).toBe(true);
  });

  it('falls back when details are missing', async () => {
    env.user.value = null;
    env.languages = undefined;
    env.accountData.value = {
      custom_attributes: { brand_info: { logos: [{ url: 'wide.png' }] } },
    };
    vi.spyOn(Intl, 'supportedValuesOf').mockImplementation(() => {
      throw new Error('unsupported');
    });
    let wrapper = await mountPage();
    expect(wrapper.find('img').attributes('src')).toBe('wide.png');
    expect(selects(wrapper)[1].props('options')).toEqual([]);
    expect(selects(wrapper)[2].props('options')).toEqual([]);

    env.accountData.value = {
      custom_attributes: { brand_info: { logos: [{}] } },
    };
    wrapper = await mountPage();
    expect(wrapper.find('img').exists()).toBe(false);
    env.accountData.value = null;
    wrapper = await mountPage();
    expect(wrapper.find('img').exists()).toBe(false);
  });

  it('shows the spinner and blocks submits while enriching', async () => {
    env.enrichment.isEnriching.value = true;
    const wrapper = await mountPage();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.findComponent(Layout).props('disabled')).toBe(true);
    await submit(wrapper);
    expect(useAlert).not.toHaveBeenCalled();
  });

  it('edits the website inline', async () => {
    const wrapper = await mountPage();
    await wrapper.findComponent(NextButton).vm.$emit('click');
    await flushPromises();
    expect(website(wrapper).props('readonly')).toBe(false);
    expect(env.focus).toHaveBeenCalled();
    await website(wrapper).vm.$emit('enterPress');
    expect(env.blur).toHaveBeenCalled();
    await website(wrapper).vm.$emit('blur');
    expect(website(wrapper).props('readonly')).toBe(true);
  });

  it('requires a website and opens it for editing', async () => {
    vi.useFakeTimers();
    const wrapper = await mountPage();
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith('ONBOARDING_NEXT.VALIDATION_ERROR');
    expect(website(wrapper).props('readonly')).toBe(false);
    expect(website(wrapper).props('customInputClass')[1]).toEqual({
      'animate-shake': true,
    });
    expect(selects(wrapper)[0].props('hasError')).toBe(false);
    vi.advanceTimersByTime(600);
    await flushPromises();
    expect(website(wrapper).props('customInputClass')[1]).toEqual({
      'animate-shake': false,
    });
    expect(env.account.finishOnboarding).not.toHaveBeenCalled();
  });

  it('saves the details and goes to the next step', async () => {
    const wrapper = await mountPage();
    await website(wrapper).vm.$emit('update:modelValue', ' acme.test ');
    await selects(wrapper)[0].vm.$emit('update:modelValue', 'founder');
    let finish;
    env.account.finishOnboarding.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = () => {
            env.accountData.value = {
              custom_attributes: { onboarding_step: 'inbox_setup' },
            };
            resolve();
          };
        })
    );
    wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(true);
    await submit(wrapper);
    expect(env.account.finishOnboarding).toHaveBeenCalledTimes(1);
    finish();
    await flushPromises();
    expect(env.account.finishOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme',
        website: 'https://acme.test',
        user_role: 'founder',
        onboarding_step: 'account_details',
      })
    );
    expect(useTrack).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        has_enriched_data: false,
        fields_changed: ['website'],
      })
    );
    expect(useAlert).toHaveBeenCalledWith('ONBOARDING_NEXT.SUCCESS');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'onboarding_inbox_setup',
      params: { accountId: 1 },
    });
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(false);
  });

  it('finishes onboarding when there is no next step', async () => {
    env.nextStep = undefined;
    const wrapper = await mountPage();
    await website(wrapper).vm.$emit('update:modelValue', 'http://acme.test');
    await submit(wrapper);
    expect(env.account.finishOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ website: 'http://acme.test' })
    );
    expect(env.store.dispatch).toHaveBeenCalledWith('setUser');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'home',
      params: { accountId: 1 },
    });
  });

  it('reports save failures', async () => {
    env.account.finishOnboarding.mockRejectedValueOnce(new Error('no'));
    const wrapper = await mountPage();
    await website(wrapper).vm.$emit('update:modelValue', 'acme.test');
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith('ONBOARDING_NEXT.ERROR');
    expect(env.router.push).not.toHaveBeenCalled();
  });
});
