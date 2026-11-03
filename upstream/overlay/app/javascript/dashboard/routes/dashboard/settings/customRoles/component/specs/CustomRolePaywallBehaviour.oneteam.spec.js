/**
 * OneTeam behaviour spec for the custom roles paywall.
 *
 * Covers the blurred sample roles table, the cloud and enterprise copy,
 * the super admin flag, and opening billing on upgrade.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import CustomRolePaywall from '../CustomRolePaywall.vue';

const env = vi.hoisted(() => ({ cloud: true, type: 'User', push: vi.fn() }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: (...args) => env.push(...args) }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name =>
    computed(
      () =>
        ({
          'globalConfig/isOnChatwootCloud': env.cloud,
          getCurrentUser: { type: env.type },
          getCurrentAccountId: 3,
        })[name]
    ),
}));

const BasePaywallModal = {
  name: 'BasePaywallModal',
  props: { i18nKey: String, isSuperAdmin: Boolean, isOnChatwootCloud: Boolean },
  emits: ['upgrade'],
  template: '<div />',
};
const CustomRoleListItem = {
  name: 'CustomRoleTableBody',
  props: ['roles'],
  template: '<tr />',
};

/**
 * Mounts the paywall.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountPaywall = () =>
  mount(CustomRolePaywall, {
    global: {
      stubs: { BasePaywallModal, CustomRoleTableBody: CustomRoleListItem },
    },
  });

describe('CustomRolePaywall behaviour', () => {
  it('shows sample roles and opens billing', () => {
    env.cloud = true;
    env.type = 'User';
    const wrapper = mountPaywall();
    expect(wrapper.findAll('th')).toHaveLength(4);
    expect(
      wrapper.getComponent(CustomRoleListItem).props('roles')
    ).toHaveLength(4);
    const modal = wrapper.getComponent(BasePaywallModal);
    expect(modal.props()).toEqual({
      i18nKey: 'PAYWALL',
      isSuperAdmin: false,
      isOnChatwootCloud: true,
    });
    modal.vm.$emit('upgrade');
    expect(env.push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 3 },
    });
  });

  it('shows the enterprise copy to super admins', () => {
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
