/**
 * OneTeam behaviour spec for the Captain response-limit banner.
 *
 * Covers fetching the limits on mount, showing the banner only above
 * 80% usage, hiding it without limits or counts, and opening billing.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import LimitBanner from '../LimitBanner.vue';

const env = vi.hoisted(() => ({
  limits: null,
  fetchLimits: vi.fn(),
  push: vi.fn(),
}));

vi.mock('dashboard/composables/useAccount', async () => {
  const { ref: r } = await import('vue');
  return { useAccount: () => ({ accountId: r(7) }) };
});
vi.mock('dashboard/composables/useCaptain', () => ({
  useCaptain: () => ({
    responseLimits: env.limits,
    fetchLimits: env.fetchLimits,
  }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
}));

const Banner = {
  name: 'Banner',
  props: ['color', 'actionLabel'],
  emits: ['action'],
  template: '<div class="banner"><slot /></div>',
};

/**
 * Mounts the banner with the given limits.
 *
 * @param {object|null} limits Captain response limits.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBanner = limits => {
  env.limits = ref(limits);
  return mount(LimitBanner, {
    global: { stubs: { Banner }, mocks: { $t: key => key } },
  });
};

const visible = wrapper =>
  wrapper.get('.banner').element.style.display !== 'none';

describe('LimitBanner behaviour', () => {
  beforeEach(() => {
    env.fetchLimits = vi.fn();
    env.push = vi.fn();
  });

  it('fetches limits and shows the banner above 80% usage', () => {
    const wrapper = mountBanner({ consumed: 90, totalCount: 100 });
    expect(env.fetchLimits).toHaveBeenCalled();
    expect(visible(wrapper)).toBe(true);
    expect(wrapper.text()).toBe('CAPTAIN.BANNER.RESPONSES');
  });

  it('hides the banner at low usage or without data', () => {
    expect(visible(mountBanner({ consumed: 10, totalCount: 100 }))).toBe(false);
    expect(visible(mountBanner({ consumed: 0, totalCount: 100 }))).toBe(false);
    expect(visible(mountBanner(null))).toBe(false);
  });

  it('opens billing for the account', () => {
    const wrapper = mountBanner({ consumed: 90, totalCount: 100 });
    wrapper.getComponent(Banner).vm.$emit('action');
    expect(env.push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 7 },
    });
  });
});
