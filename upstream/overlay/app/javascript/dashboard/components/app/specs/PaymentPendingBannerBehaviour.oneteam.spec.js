/**
 * OneTeam behaviour spec for the past-due payment banner.
 *
 * Covers hiding it when paid up, the admin message with a billing link
 * (tracked), the agent message without one, and refetching the account
 * on window focus only while past due with an account id.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import PaymentPendingBanner from '../PaymentPendingBanner.vue';
import { useTrack } from 'dashboard/composables';

const status = {
  accountId: ref(1),
  isPastDue: ref(true),
  canManagePayment: ref(true),
};
const push = vi.fn();
const dispatch = vi.fn();
let onFocus;

vi.mock('dashboard/composables/usePaymentStatus', () => ({
  usePaymentStatus: () => status,
}));
vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push }),
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useEventListener: (target, name, handler) => {
    onFocus = handler;
  },
}));

const Banner = {
  name: 'Banner',
  props: ['actionLabel'],
  emits: ['action'],
  template: '<p><slot /></p>',
};
const mountBanner = () =>
  mount(PaymentPendingBanner, { global: { stubs: { Banner } } });

describe('PaymentPendingBanner behaviour', () => {
  beforeEach(() => {
    status.accountId.value = 1;
    status.isPastDue.value = true;
    status.canManagePayment.value = true;
  });

  it('links admins to billing', () => {
    const banner = mountBanner().findComponent(Banner);
    expect(banner.text()).toBe('GENERAL_SETTINGS.PAYMENT_PENDING');
    expect(banner.props('actionLabel')).toBe('GENERAL_SETTINGS.OPEN_BILLING');
    banner.vm.$emit('action');
    expect(useTrack).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 1 },
    });
  });

  it('tells agents without a link and hides when paid', async () => {
    status.canManagePayment.value = false;
    const wrapper = mountBanner();
    const banner = wrapper.findComponent(Banner);
    expect(banner.text()).toBe('GENERAL_SETTINGS.PAYMENT_PENDING_AGENT');
    expect(banner.props('actionLabel')).toBe(null);
    banner.vm.$emit('action');
    expect(push).not.toHaveBeenCalled();
    status.isPastDue.value = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(Banner).exists()).toBe(false);
  });

  it('refetches the account on focus while past due', () => {
    mountBanner();
    onFocus();
    expect(dispatch).toHaveBeenCalledWith('accounts/get', {
      accountId: 1,
      silent: true,
    });
    status.accountId.value = null;
    onFocus();
    status.accountId.value = 1;
    status.isPastDue.value = false;
    onFocus();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
