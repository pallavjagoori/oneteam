/**
 * OneTeam behaviour spec for the Captain document-limit banner.
 *
 * Covers fetching the limits on mount, showing the banner only when no
 * documents are left, hiding it without limits, and opening billing.
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
  return { useAccount: () => ({ accountId: r(3) }) };
});
vi.mock('dashboard/composables/useCaptain', () => ({
  useCaptain: () => ({
    documentLimits: env.limits,
    fetchLimits: env.fetchLimits,
  }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
}));

const Banner = {
  name: 'Banner',
  emits: ['action'],
  template: '<div class="banner"><slot /></div>',
};

/**
 * Mounts the banner with the given limits.
 *
 * @param {object|null} limits Captain document limits.
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

describe('Document LimitBanner behaviour', () => {
  beforeEach(() => {
    env.fetchLimits = vi.fn();
    env.push = vi.fn();
  });

  it('shows the banner when no documents are left and opens billing', () => {
    const wrapper = mountBanner({ currentAvailable: 0 });
    expect(env.fetchLimits).toHaveBeenCalled();
    expect(visible(wrapper)).toBe(true);
    wrapper.getComponent(Banner).vm.$emit('action');
    expect(env.push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 3 },
    });
  });

  it('hides the banner while documents remain or without limits', () => {
    expect(visible(mountBanner({ currentAvailable: 2 }))).toBe(false);
    expect(visible(mountBanner(null))).toBe(false);
  });
});
