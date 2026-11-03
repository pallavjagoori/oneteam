/**
 * OneTeam behaviour spec for the SAML paywall.
 *
 * Covers cloud and self-hosted copy, the super admin flag, and opening
 * billing from the upgrade action.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import SamlPaywall from '../SamlPaywall.vue';

const env = vi.hoisted(() => ({
  push: vi.fn(),
  cloud: true,
  userType: 'SuperAdmin',
}));

vi.mock('vue-router', () => ({ useRouter: () => ({ push: env.push }) }));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => ({ type: env.userType })),
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
 * Mounts the paywall and returns the modal stub.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The modal wrapper.
 */
const mountModal = () =>
  mount(SamlPaywall, { global: { stubs: { BasePaywallModal } } }).getComponent(
    BasePaywallModal
  );

describe('SamlPaywall behaviour', () => {
  it('shows the cloud paywall to super admins and opens billing', () => {
    env.cloud = true;
    env.userType = 'SuperAdmin';
    const modal = mountModal();
    expect(modal.props()).toEqual({
      featurePrefix: 'SECURITY_SETTINGS.SAML',
      i18nKey: 'PAYWALL',
      isSuperAdmin: true,
      isOnChatwootCloud: true,
    });
    modal.vm.$emit('upgrade');
    expect(env.push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 5 },
    });
  });

  it('shows the enterprise paywall on self-hosted installs', () => {
    env.cloud = false;
    env.userType = 'User';
    expect(mountModal().props()).toMatchObject({
      i18nKey: 'ENTERPRISE_PAYWALL',
      isSuperAdmin: false,
      isOnChatwootCloud: false,
    });
  });
});
