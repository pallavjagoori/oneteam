import { createPinia, setActivePinia } from 'pinia';
import CaptainPreferencesAPI from 'dashboard/api/captain/preferences';
import { useCaptainConfigStore } from '../preferences';

vi.mock('dashboard/api/captain/preferences', () => ({
  default: { get: vi.fn(), updatePreferences: vi.fn() },
}));

describe('Captain preferences store (OneTeam)', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useCaptainConfigStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads providers, models and features', async () => {
    CaptainPreferencesAPI.get.mockResolvedValue({
      data: {
        providers: { openai: {} },
        models: { m: {} },
        features: { f: {} },
      },
    });
    const pending = store.fetch();
    expect(store.getUIFlags.isFetching).toBe(true);
    await pending;
    expect(store.getProviders).toEqual({ openai: {} });
    expect(store.getModels).toEqual({ m: {} });
    expect(store.getFeatures).toEqual({ f: {} });
    expect(store.getUIFlags.isFetching).toBe(false);
  });

  it('falls back to empty settings', async () => {
    CaptainPreferencesAPI.get.mockResolvedValue({ data: {} });
    await store.fetch();
    expect(store.getProviders).toEqual({});
    CaptainPreferencesAPI.updatePreferences.mockResolvedValue({ data: {} });
    await store.updatePreferences({});
    expect(store.getModels).toEqual({});
    expect(store.getFeatures).toEqual({});
  });

  it('ignores a failed load', async () => {
    CaptainPreferencesAPI.get.mockRejectedValue(new Error('down'));
    await store.fetch();
    expect(store.getUIFlags.isFetching).toBe(false);
    expect(store.getFeatures).toEqual({});
  });

  it('saves preferences', async () => {
    CaptainPreferencesAPI.updatePreferences.mockResolvedValue({
      data: { providers: { p: 1 }, models: { m: 1 }, features: { f: 1 } },
    });
    await store.updatePreferences({ f: 'm' });
    expect(CaptainPreferencesAPI.updatePreferences).toHaveBeenCalledWith({
      f: 'm',
    });
    expect(store.getFeatures).toEqual({ f: 1 });
  });

  describe('models per feature', () => {
    beforeEach(() => {
      store.features = {
        reply: {
          default: 'gpt',
          selected: 'claude',
          models: [
            { id: 'soon', provider: 'openai', coming_soon: true },
            { id: 'gem', provider: 'gemini', credit_multiplier: 1 },
            { id: 'claude', provider: 'anthropic', credit_multiplier: 2 },
            { id: 'gpt-mini', provider: 'openai' },
            { id: 'gpt', provider: 'openai', credit_multiplier: 3 },
            { id: 'other', provider: 'mistral' },
            { id: 'later', provider: 'gemini', coming_soon: true },
            { id: 'mistral', provider: 'mistral', credit_multiplier: 1 },
            { id: 'local' },
          ],
        },
        summary: { default: 'gpt' },
      };
    });

    it('orders models by provider, then cost, with coming-soon models last', () => {
      expect(store.getModelsForFeature('reply').map(m => m.id)).toEqual([
        'gpt',
        'gpt-mini',
        'claude',
        'gem',
        'mistral',
        'other',
        'local',
        'soon',
        'later',
      ]);
      expect(store.getModelsForFeature('missing')).toEqual([]);
    });

    it('reports the default and selected model', () => {
      expect(store.getDefaultModelForFeature('reply')).toBe('gpt');
      expect(store.getDefaultModelForFeature('missing')).toBeNull();
      expect(store.getSelectedModelForFeature('reply')).toBe('claude');
      expect(store.getSelectedModelForFeature('summary')).toBe('gpt');
      expect(store.getSelectedModelForFeature('missing')).toBeNull();
    });
  });
});
