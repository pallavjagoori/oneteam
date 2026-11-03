/**
 * OneTeam behaviour spec for the webhook integration paywall.
 *
 * Covers the cloud paywall copy and opening billing for the current
 * account from the upgrade action.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import WebhookPaywall from '../WebhookPaywall.vue';

const push = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => 12),
}));

const BasePaywallModal = {
  name: 'BasePaywallModal',
  props: { featurePrefix: String, i18nKey: String, isOnChatwootCloud: Boolean },
  emits: ['upgrade'],
  template: '<div />',
};

describe('WebhookPaywall behaviour', () => {
  it('opens billing from the upgrade action', () => {
    const wrapper = mount(WebhookPaywall, {
      global: { stubs: { BasePaywallModal } },
    });
    const modal = wrapper.getComponent(BasePaywallModal);
    expect(modal.props()).toEqual({
      featurePrefix: 'INTEGRATION_SETTINGS.WEBHOOK',
      i18nKey: 'PAYWALL',
      isOnChatwootCloud: true,
    });
    modal.vm.$emit('upgrade');
    expect(push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 12 },
    });
  });
});
