/**
 * OneTeam behaviour spec for the Captain paywall.
 *
 * Covers the cloud and self-hosted paywall copy, the super admin flag,
 * and opening billing on upgrade.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import Paywall from '../Paywall.vue';

const env = vi.hoisted(() => ({ cloud: true, push: null, type: 'User' }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: (...args) => env.push(...args) }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => ({ type: env.type })),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountId: computed(() => 5),
    isOnChatwootCloud: computed(() => env.cloud),
  }),
}));

const BasePaywallModal = {
  name: 'BasePaywallModal',
  props: {
    featurePrefix: String,
    i18nKey: String,
    isSuperAdmin: Boolean,
    isOnChatwootCloud: Boolean,
  },
  emits: ['upgrade'],
  template: '<div />',
};

/**
 * Mounts the paywall.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountPaywall = () =>
  mount(Paywall, { global: { stubs: { BasePaywallModal } } });

describe('Paywall behaviour', () => {
  it('opens billing from the cloud paywall', () => {
    env.cloud = true;
    env.type = 'User';
    env.push = vi.fn();
    const modal = mountPaywall().getComponent(BasePaywallModal);
    expect(modal.props()).toEqual({
      featurePrefix: 'CAPTAIN',
      i18nKey: 'PAYWALL',
      isSuperAdmin: false,
      isOnChatwootCloud: true,
    });
    modal.vm.$emit('upgrade');
    expect(env.push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 5 },
    });
  });

  it('shows the enterprise paywall to super admins off cloud', () => {
    env.cloud = false;
    env.type = 'SuperAdmin';
    expect(mountPaywall().getComponent(BasePaywallModal).props()).toMatchObject(
      {
        i18nKey: 'ENTERPRISE_PAYWALL',
        isSuperAdmin: true,
      }
    );
  });
});
