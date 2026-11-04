/**
 * OneTeam behaviour spec for the conversation OnboardingView.
 *
 * Covers the morning, afternoon and evening greetings with the user's
 * name and installation name, and the four feature cards.
 */
import { mount } from '@vue/test-utils';
import OnboardingView from '../OnboardingView.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => `${key}:${params.name}:${params.installationName}`,
  }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStoreGetters: () => ({
      'globalConfig/get': computed(() => ({ installationName: 'Desk' })),
      getCurrentUser: computed(() => ({ name: 'Ann' })),
    }),
  };
});

/**
 * Mounts the view at a given hour.
 *
 * @param {number} hour local hour of day
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountAt = hour => {
  vi.setSystemTime(new Date(2026, 0, 5, hour, 0, 0));
  return mount(OnboardingView, {
    global: {
      mocks: { $t: key => key },
      stubs: { OnboardingFeatureCard: { template: '<div class="card" />' } },
    },
  });
};

describe('OnboardingView behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [9, 'ONBOARDING.GREETING_MORNING'],
    [14, 'ONBOARDING.GREETING_AFTERNOON'],
    [20, 'ONBOARDING.GREETING_EVENING'],
  ])('greets the user at %i:00', (hour, key) => {
    const wrapper = mountAt(hour);
    expect(wrapper.text()).toContain(`${key}:Ann:Desk`);
    expect(wrapper.findAll('.card')).toHaveLength(4);
  });
});
