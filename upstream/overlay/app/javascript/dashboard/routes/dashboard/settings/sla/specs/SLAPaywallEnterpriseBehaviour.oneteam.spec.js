/**
 * OneTeam behaviour spec for the SLA paywall.
 *
 * Covers cloud and enterprise copy and relaying the upgrade action.
 */
import { mount } from '@vue/test-utils';
import SLAPaywallEnterprise from '../SLAPaywallEnterprise.vue';

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
 * @param {object} props Paywall props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountPaywall = props =>
  mount(SLAPaywallEnterprise, {
    props,
    global: { stubs: { BasePaywallModal } },
  });

describe('SLAPaywallEnterprise behaviour', () => {
  it('shows the cloud paywall and relays upgrades', () => {
    const wrapper = mountPaywall({
      isOnChatwootCloud: true,
      isSuperAdmin: true,
    });
    const modal = wrapper.getComponent(BasePaywallModal);
    expect(modal.props()).toEqual({
      featurePrefix: 'SLA',
      i18nKey: 'PAYWALL',
      isSuperAdmin: true,
      isOnChatwootCloud: true,
    });
    modal.vm.$emit('upgrade');
    expect(wrapper.emitted('upgrade')).toHaveLength(1);
  });

  it('shows the enterprise paywall by default', () => {
    expect(mountPaywall().getComponent(BasePaywallModal).props('i18nKey')).toBe(
      'ENTERPRISE_PAYWALL'
    );
  });
});
