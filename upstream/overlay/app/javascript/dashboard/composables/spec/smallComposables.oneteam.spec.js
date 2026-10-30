import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useLiveRefresh } from '../useLiveRefresh';
import { useTranslationPlan } from '../useTranslationPlan';
import { useCampaignAnalytics } from '../useCampaignAnalytics';
import { useCompaniesPaywall } from '../useCompaniesPaywall';
import { usePaymentStatus } from '../usePaymentStatus';
import {
  useStore,
  useStoreGetters,
  useMapGetter,
  useFunctionGetter,
} from '../store';

/*
 * OneTeam coverage for small composables that each need only a few cases:
 * the live refresh timer, the translation and
 * campaign-analytics plan checks, the companies paywall, the past-due
 * banner and the Vuex store helpers.
 */
const ctx = vi.hoisted(() => ({
  account: {},
  config: {},
  policy: {},
}));

vi.mock('../useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({
      accountId: computed(() => ctx.account.current?.id),
      currentAccount: computed(() => ctx.account.current),
      isOnChatwootCloud: computed(() => ctx.account.cloud),
    }),
  };
});
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ctx.config,
}));
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ctx.policy,
}));
vi.mock('../useAdmin', () => ({ useAdmin: () => ({ isAdmin: true }) }));

const withSetup = (composable, $store) => {
  let result;
  const wrapper = mount(
    defineComponent({
      setup() {
        result = composable();
        return () => null;
      },
    }),
    { global: { config: { globalProperties: { $store } } } }
  );
  return { result, wrapper };
};

describe('small composables (OneTeam)', () => {
  describe('useLiveRefresh', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('calls back on every interval until stopped or unmounted', async () => {
      const callback = vi.fn();
      const { result, wrapper } = withSetup(() =>
        useLiveRefresh(callback, 100)
      );
      result.stopRefetching();
      result.startRefetching();
      await vi.advanceTimersByTimeAsync(250);
      expect(callback).toHaveBeenCalledTimes(2);
      wrapper.unmount();
      await vi.advanceTimersByTimeAsync(500);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('uses a one minute default', async () => {
      const callback = vi.fn();
      const { result, wrapper } = withSetup(() => useLiveRefresh(callback));
      result.startRefetching();
      await vi.advanceTimersByTimeAsync(60000);
      expect(callback).toHaveBeenCalledTimes(1);
      wrapper.unmount();
    });
  });

  describe('useTranslationPlan', () => {
    it.each([
      [
        {
          cloud: true,
          current: { custom_attributes: { plan_name: 'Hacker' } },
        },
        {},
        false,
        true,
      ],
      [{ cloud: true, current: {} }, {}, true, false],
      [
        { cloud: false },
        { isEnterprise: true, enterprisePlanName: 'enterprise' },
        true,
        false,
      ],
      [
        { cloud: false },
        { isEnterprise: true, enterprisePlanName: 'community' },
        false,
        false,
      ],
      [{ cloud: false }, { isEnterprise: false }, false, false],
    ])('account %o with config %o', (account, config, available, upgrade) => {
      ctx.account = account;
      ctx.config = config;
      const { isAvailable, needsUpgrade } = useTranslationPlan();
      expect(isAvailable.value).toBe(available);
      expect(needsUpgrade.value).toBe(upgrade);
    });
  });

  it('shows campaign analytics only on enterprise with the flag and no paywall', () => {
    ctx.config = { isEnterprise: true };
    ctx.policy = {
      shouldShowPaywall: () => false,
      isFeatureFlagEnabled: () => true,
    };
    expect(useCampaignAnalytics().canViewAnalytics.value).toBe(true);
    ctx.policy.shouldShowPaywall = () => true;
    const paywalled = useCampaignAnalytics();
    expect(paywalled.showPaywall.value).toBe(true);
    expect(paywalled.canViewAnalytics.value).toBe(false);
    ctx.config = { isEnterprise: false };
    expect(useCampaignAnalytics().canViewAnalytics.value).toBe(false);
  });

  it('waits for the account before deciding the companies paywall', () => {
    ctx.policy = { shouldShowPaywall: () => true };
    ctx.account = { current: null };
    expect(useCompaniesPaywall().showPaywall.value).toBe(false);
    ctx.account = { current: { id: 1 } };
    const ready = useCompaniesPaywall();
    expect(ready.isReady.value).toBe(true);
    expect(ready.showPaywall.value).toBe(true);
  });

  it('flags past-due Stripe subscriptions on cloud', () => {
    ctx.account = {
      cloud: true,
      current: {
        id: 3,
        billing_provider: 'stripe',
        custom_attributes: { subscription_status: 'past_due' },
      },
    };
    const status = usePaymentStatus();
    expect(status.isPastDue.value).toBe(true);
    expect(status.accountId.value).toBe(3);
    expect(status.canManagePayment).toBe(true);
    ctx.account = { cloud: false, current: ctx.account.current };
    expect(usePaymentStatus().isPastDue.value).toBe(false);
  });

  describe('store helpers', () => {
    it('refuses to run outside setup', () => {
      expect(() => useStore()).toThrow('must be called in setup');
    });

    it('reads getters, mapped getters and function getters', () => {
      const $store = {
        getters: { count: 2, double: n => n * 2 },
      };
      const arg = ref(5);
      const { result } = withSetup(
        () => ({
          all: useStoreGetters(),
          count: useMapGetter('count'),
          doubled: useFunctionGetter('double', arg),
        }),
        $store
      );
      expect(result.all.count.value).toBe(2);
      expect(result.count.value).toBe(2);
      expect(result.doubled.value).toBe(10);
    });
  });
});
