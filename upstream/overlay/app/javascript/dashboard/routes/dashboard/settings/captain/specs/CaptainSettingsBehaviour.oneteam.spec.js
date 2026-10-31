/**
 * OneTeam behaviour spec for the Captain settings page.
 *
 * Covers fetching preferences on mount, the loading flag, the paywall when
 * Captain is off, which model selectors and feature toggles show and are
 * allowed on cloud, community, enterprise and paid self-hosted installs,
 * and saving model and feature changes (with refetch on failure).
 */
import { computed, reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CaptainSettings from '../Index.vue';

const env = vi.hoisted(() => ({
  store: null,
  captainEnabled: true,
  cloud: false,
  isEnterprise: false,
  plan: '',
}));

vi.mock('pinia', async importOriginal => ({
  ...(await importOriginal()),
  storeToRefs: store => ({ uiFlags: computed(() => store.uiFlags) }),
}));
vi.mock('dashboard/store/captain/preferences', () => ({
  useCaptainConfigStore: () => env.store,
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useCaptain', () => ({
  useCaptain: () => ({ captainEnabled: env.captainEnabled }),
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({
    isEnterprise: env.isEnterprise,
    enterprisePlanName: env.plan,
  }),
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { ref } = await import('vue');
  return { useAccount: () => ({ isOnChatwootCloud: ref(env.cloud) }) };
});

const feature = name => ({
  name,
  props: { featureKey: String, isAllowed: Boolean, title: String },
  emits: ['change', 'modelChange'],
  template: `<div class="${name}" :data-key="featureKey" :data-allowed="String(isAllowed)" />`,
});
const ModelSelector = feature('ModelSelector');
const FeatureToggle = feature('FeatureToggle');

const mountPage = async () => {
  const wrapper = mount(CaptainSettings, {
    global: {
      stubs: {
        SettingsLayout: {
          props: ['isLoading'],
          template:
            '<div :data-loading="String(isLoading)"><slot name="header" /><slot name="body" /></div>',
        },
        BaseSettingsHeader: true,
        SectionLayout: { template: '<section><slot /></section>' },
        ModelSelector,
        FeatureToggle,
        CaptainPaywall: { template: '<div class="paywall" />' },
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const visible = (wrapper, component) =>
  wrapper
    .findAllComponents(component)
    .filter(item => item.element.style.display !== 'none')
    .map(
      item =>
        `${item.attributes('data-key')}:${item.attributes('data-allowed')}`
    );

describe('Captain settings behaviour', () => {
  beforeEach(() => {
    env.store = reactive({
      uiFlags: { isFetching: false },
      fetch: vi.fn(),
      updatePreferences: vi.fn(),
    });
    env.captainEnabled = true;
    env.cloud = false;
    env.isEnterprise = false;
    env.plan = '';
  });

  it('fetches preferences and shows the loading flag', async () => {
    env.store.uiFlags.isFetching = true;
    const wrapper = await mountPage();
    expect(env.store.fetch).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-loading]').attributes('data-loading')).toBe(
      'true'
    );
  });

  it('shows the paywall when Captain is off', async () => {
    env.captainEnabled = false;
    const wrapper = await mountPage();
    expect(wrapper.find('.paywall').exists()).toBe(true);
    expect(wrapper.findComponent(ModelSelector).exists()).toBe(false);
  });

  it('shows only community features on community installs', async () => {
    const wrapper = await mountPage();
    expect(visible(wrapper, ModelSelector)).toEqual(['editor:true']);
    expect(visible(wrapper, FeatureToggle)).toEqual([]);
  });

  it('shows but locks enterprise features on unpaid enterprise installs', async () => {
    env.isEnterprise = true;
    env.plan = 'community';
    const wrapper = await mountPage();
    expect(visible(wrapper, ModelSelector)).toEqual([
      'editor:true',
      'assistant:false',
      'copilot:false',
    ]);
    expect(visible(wrapper, FeatureToggle)).toEqual([
      'help_center_search:false',
      'audio_transcription:false',
    ]);
  });

  it('unlocks enterprise features on paid self-hosted installs', async () => {
    env.isEnterprise = true;
    env.plan = 'premium';
    const wrapper = await mountPage();
    expect(visible(wrapper, FeatureToggle)).toEqual([
      'help_center_search:true',
      'audio_transcription:true',
    ]);
  });

  it('shows everything on cloud', async () => {
    env.cloud = true;
    const wrapper = await mountPage();
    expect(visible(wrapper, ModelSelector)).toEqual([
      'editor:true',
      'assistant:true',
      'copilot:true',
    ]);
  });

  it('saves model and feature changes', async () => {
    const wrapper = await mountPage();
    await wrapper
      .findComponent(ModelSelector)
      .vm.$emit('change', { feature: 'editor', model: 'gpt-x' });
    await flushPromises();
    expect(env.store.updatePreferences).toHaveBeenCalledWith({
      captain_models: { editor: 'gpt-x' },
    });
    expect(useAlert).toHaveBeenLastCalledWith('CAPTAIN_SETTINGS.API.SUCCESS');
    const toggle = wrapper.findComponent(FeatureToggle);
    await toggle.vm.$emit('change', {
      feature: 'audio_transcription',
      enabled: true,
    });
    await flushPromises();
    expect(env.store.updatePreferences).toHaveBeenLastCalledWith({
      captain_features: { audio_transcription: true },
    });
    await toggle.vm.$emit('modelChange', {
      feature: 'audio_transcription',
      model: 'whisper',
    });
    await flushPromises();
    expect(env.store.updatePreferences).toHaveBeenLastCalledWith({
      captain_models: { audio_transcription: 'whisper' },
    });
    expect(env.store.fetch).toHaveBeenCalledTimes(1);
  });

  it('refetches after failed saves', async () => {
    env.store.updatePreferences.mockRejectedValue(new Error('x'));
    const wrapper = await mountPage();
    await wrapper
      .findComponent(ModelSelector)
      .vm.$emit('change', { feature: 'editor', model: 'm' });
    await flushPromises();
    await wrapper
      .findComponent(FeatureToggle)
      .vm.$emit('change', { feature: 'help_center_search', enabled: false });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('CAPTAIN_SETTINGS.API.ERROR');
    expect(env.store.fetch).toHaveBeenCalledTimes(3);
  });
});
