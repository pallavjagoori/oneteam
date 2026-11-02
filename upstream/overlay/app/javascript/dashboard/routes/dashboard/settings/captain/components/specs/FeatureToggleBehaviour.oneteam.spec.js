/**
 * OneTeam behaviour spec for a Captain feature toggle card.
 *
 * Covers the title, description and model texts for audio transcription,
 * help center search and unknown features, syncing the switch from the
 * stored feature config, showing the model picker only when the feature
 * is on and has several models, hiding controls when not allowed, and
 * the change and modelChange events.
 */
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useCaptainConfigStore } from 'dashboard/store/captain/preferences';
import FeatureToggle from '../FeatureToggle.vue';

const Switch = {
  name: 'Switch',
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<button class="switch" />',
};
const ModelDropdown = {
  name: 'ModelDropdown',
  props: ['featureKey'],
  emits: ['change'],
  template: '<div class="model-dropdown" />',
};

let store;

const mountToggle = (props = {}) =>
  mount(FeatureToggle, {
    props: { featureKey: 'audio_transcription', isAllowed: true, ...props },
    global: { stubs: { Switch, ModelDropdown } },
  });

describe('FeatureToggle behaviour', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    store = useCaptainConfigStore();
  });

  it.each([
    ['audio_transcription', 'AUDIO_TRANSCRIPTION'],
    ['help_center_search', 'HELP_CENTER_SEARCH'],
  ])('shows the texts for %s', (featureKey, key) => {
    store.features = {
      [featureKey]: {
        enabled: true,
        models: [{ id: 'a' }, { id: 'b' }],
      },
    };
    const wrapper = mountToggle({ featureKey });
    const text = wrapper.text();
    expect(text).toContain(`CAPTAIN_SETTINGS.FEATURES.${key}.TITLE`);
    expect(text).toContain(`CAPTAIN_SETTINGS.FEATURES.${key}.DESCRIPTION`);
    expect(text).toContain(`CAPTAIN_SETTINGS.FEATURES.${key}.MODEL_TITLE`);
    expect(text).toContain(
      `CAPTAIN_SETTINGS.FEATURES.${key}.MODEL_DESCRIPTION`
    );
    expect(wrapper.findComponent(ModelDropdown).props('featureKey')).toBe(
      featureKey
    );
    expect(wrapper.classes()).toContain('flex-col');
  });

  it('shows empty texts for an unknown feature', () => {
    store.features = {
      other: { enabled: true, models: [{ id: 'a' }, { id: 'b' }] },
    };
    const wrapper = mountToggle({ featureKey: 'other' });
    expect(wrapper.findAll('h4').map(h => h.text())).toEqual(['', '']);
    expect(wrapper.findAll('p').map(p => p.text())).toEqual(['', '']);
  });

  it('hides the model picker when off or with a single model', async () => {
    store.features = {
      audio_transcription: { enabled: false, models: [{ id: 'a' }] },
    };
    const wrapper = mountToggle();
    expect(wrapper.findComponent(Switch).props('modelValue')).toBe(false);
    expect(wrapper.findComponent(ModelDropdown).exists()).toBe(false);
    expect(wrapper.classes()).toContain('items-center');

    store.features = {
      audio_transcription: { enabled: true, models: [{ id: 'a' }] },
    };
    await nextTick();
    expect(wrapper.findComponent(Switch).props('modelValue')).toBe(true);
    expect(wrapper.findComponent(ModelDropdown).exists()).toBe(false);
  });

  it('keeps the switch off while the feature config is missing', () => {
    store.features = {};
    const wrapper = mountToggle();
    expect(wrapper.findComponent(Switch).props('modelValue')).toBe(false);
  });

  it('hides the controls and dims the card when not allowed', () => {
    store.features = {
      audio_transcription: {
        enabled: true,
        models: [{ id: 'a' }, { id: 'b' }],
      },
    };
    const wrapper = mountToggle({ isAllowed: false });
    expect(wrapper.findComponent(Switch).exists()).toBe(false);
    expect(wrapper.findComponent(ModelDropdown).exists()).toBe(false);
    expect(wrapper.classes()).toContain('opacity-60');
  });

  it('emits change and modelChange', async () => {
    store.features = {
      audio_transcription: {
        enabled: false,
        models: [{ id: 'a' }, { id: 'b' }],
      },
    };
    const wrapper = mountToggle();
    const toggle = wrapper.findComponent(Switch);
    await toggle.vm.$emit('update:modelValue', true);
    await toggle.vm.$emit('change');
    expect(wrapper.emitted('change')[0][0]).toEqual({
      feature: 'audio_transcription',
      enabled: true,
    });

    await wrapper
      .findComponent(ModelDropdown)
      .vm.$emit('change', { feature: 'audio_transcription', model: 'b' });
    expect(wrapper.emitted('modelChange')[0][0]).toEqual({
      feature: 'audio_transcription',
      model: 'b',
    });
  });
});
