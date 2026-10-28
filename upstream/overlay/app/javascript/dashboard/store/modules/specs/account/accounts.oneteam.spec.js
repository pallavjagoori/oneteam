import AccountAPI from 'dashboard/api/account';
import OnboardingAPI from 'dashboard/api/onboarding';
import EnterpriseAccountAPI from 'dashboard/api/enterprise/account';
import WhatsappChannel from 'dashboard/api/channel/whatsappChannel';
import accounts from '../../accounts';
import { apiError, buildStore } from '../../../specs/oneteamStore';

/*
 * OneTeam coverage for the accounts Vuex module, run as a real store:
 * trial and RTL getters, onboarding, deletion, billing (checkout,
 * subscription, currency, limits) and WhatsApp embedded signup access.
 */
const { mockApi } = vi.hoisted(() => ({
  mockApi: methods => ({
    default: Object.fromEntries(methods.map(name => [name, vi.fn()])),
  }),
}));
vi.mock('dashboard/api/account', () =>
  mockApi(['get', 'update', 'delete', 'createAccount', 'getCacheKeys'])
);
vi.mock('dashboard/api/onboarding', () => mockApi(['update']));
vi.mock('dashboard/api/enterprise/account', () =>
  mockApi([
    'toggleDeletion',
    'checkout',
    'subscription',
    'selectBillingCurrency',
    'getLimits',
  ])
);
vi.mock('dashboard/api/channel/whatsappChannel', () =>
  mockApi(['requestEmbeddedSignupAccess'])
);

describe('accounts store (OneTeam)', () => {
  let store;

  beforeEach(() => {
    store = buildStore({ accounts });
    store.commit('accounts/ADD_ACCOUNT', {
      id: 1,
      locale: 'ar',
      features: { inbox: true },
      created_at: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const flags = () => store.getters['accounts/getUIFlags'];

  describe('getters', () => {
    it('knows whether an account is still in its 15-day trial', () => {
      expect(store.getters['accounts/isTrialAccount'](1)).toBe(true);
      store.commit('accounts/EDIT_ACCOUNT', {
        id: 1,
        created_at: '2020-01-01T00:00:00Z',
      });
      expect(store.getters['accounts/isTrialAccount'](1)).toBe(false);
    });

    it('reports features, defaulting to off for unknown accounts', () => {
      expect(
        store.getters['accounts/isFeatureEnabledonAccount'](1, 'inbox')
      ).toBe(true);
      expect(store.getters['accounts/isFeatureEnabledonAccount'](1, 'x')).toBe(
        false
      );
      expect(
        store.getters['accounts/isFeatureEnabledonAccount'](9, 'inbox')
      ).toBe(false);
    });

    it('reads right-to-left from the user locale, then the account locale', () => {
      const isRTL = (route, getUISettings) =>
        accounts.getters.isRTL(
          { records: [{ id: 1, locale: 'ar' }] },
          {},
          { route },
          { getUISettings }
        );
      expect(isRTL({ params: { accountId: '1' } })).toBe(true);
      expect(isRTL({ params: { accountId: '1' } }, { locale: 'en' })).toBe(
        false
      );
      expect(isRTL(undefined)).toBe(false);
    });
  });

  it('turns on WhatsApp embedded signup for the current account', async () => {
    WhatsappChannel.requestEmbeddedSignupAccess.mockResolvedValue({
      data: { features: { whatsapp_embedded_signup: true } },
    });
    await accounts.actions.requestWhatsappEmbeddedSignupAccess(
      {
        commit: (type, payload) => store.commit(`accounts/${type}`, payload),
        state: store.state.accounts,
        rootState: { route: { params: { accountId: '1' } } },
      },
      'support'
    );
    expect(WhatsappChannel.requestEmbeddedSignupAccess).toHaveBeenCalledWith(
      'support'
    );
    expect(store.getters['accounts/getAccount'](1).features).toEqual({
      whatsapp_embedded_signup: true,
    });
  });

  it('finishes onboarding and always clears the updating flag', async () => {
    OnboardingAPI.update.mockResolvedValueOnce({ data: { id: 1, name: 'A' } });
    await store.dispatch('accounts/finishOnboarding', { name: 'A' });
    expect(store.getters['accounts/getAccount'](1).name).toBe('A');

    OnboardingAPI.update.mockRejectedValueOnce(new Error('bad'));
    await expect(
      store.dispatch('accounts/finishOnboarding', {})
    ).rejects.toThrow('bad');
    expect(flags().isUpdating).toBe(false);
  });

  it('deletes an account, wrapping errors', async () => {
    AccountAPI.delete.mockResolvedValueOnce({});
    await store.dispatch('accounts/delete', { id: 1 });
    expect(AccountAPI.delete).toHaveBeenCalledWith(1);

    AccountAPI.delete.mockRejectedValueOnce('locked');
    await expect(store.dispatch('accounts/delete', { id: 1 })).rejects.toThrow(
      'locked'
    );
    expect(flags().isUpdating).toBe(false);
  });

  it('defaults the deletion toggle to "delete"', async () => {
    EnterpriseAccountAPI.toggleDeletion.mockResolvedValue({});
    await accounts.actions.toggleDeletion({ commit: vi.fn() });
    expect(EnterpriseAccountAPI.toggleDeletion).toHaveBeenCalledWith('delete');
  });

  describe('billing', () => {
    it('sends the user to the checkout page', async () => {
      const location = window.location;
      delete window.location;
      window.location = '';
      EnterpriseAccountAPI.checkout.mockResolvedValue({
        data: { redirect_url: 'https://pay.example.com' },
      });
      await store.dispatch('accounts/checkout');
      expect(window.location).toBe('https://pay.example.com');
      window.location = location;
    });

    it('reports a failed checkout', async () => {
      EnterpriseAccountAPI.checkout.mockRejectedValue(apiError('Stripe down'));
      await expect(store.dispatch('accounts/checkout')).rejects.toThrow(
        'Stripe down'
      );
      expect(flags().isCheckoutInProcess).toBe(false);
    });

    it('loads the subscription, or reports the error', async () => {
      EnterpriseAccountAPI.subscription.mockResolvedValueOnce({
        data: { plan: 'pro' },
      });
      await expect(store.dispatch('accounts/subscription')).resolves.toEqual({
        plan: 'pro',
      });
      EnterpriseAccountAPI.subscription.mockRejectedValueOnce(apiError('No'));
      await expect(store.dispatch('accounts/subscription')).rejects.toThrow(
        'No'
      );
      expect(flags().isCheckoutInProcess).toBe(false);
    });

    it('selects the billing currency, or reports the error', async () => {
      EnterpriseAccountAPI.selectBillingCurrency.mockResolvedValueOnce({});
      await store.dispatch('accounts/selectBillingCurrency', 'eur');
      expect(EnterpriseAccountAPI.selectBillingCurrency).toHaveBeenCalledWith(
        'eur'
      );
      EnterpriseAccountAPI.selectBillingCurrency.mockRejectedValueOnce(
        apiError('Locked')
      );
      await expect(
        store.dispatch('accounts/selectBillingCurrency', 'eur')
      ).rejects.toThrow('Locked');
      expect(flags().isCheckoutInProcess).toBe(false);
    });

    it('stores usage limits and ignores failures', async () => {
      EnterpriseAccountAPI.getLimits.mockResolvedValueOnce({
        data: { id: 1, limits: { agents: 5 } },
      });
      await store.dispatch('accounts/limits');
      expect(store.getters['accounts/getAccount'](1).limits).toEqual({
        agents: 5,
      });
      EnterpriseAccountAPI.getLimits.mockRejectedValueOnce(new Error('x'));
      await store.dispatch('accounts/limits');
      expect(flags().isFetchingLimits).toBe(false);
    });
  });

  it('updates silently without touching the updating flag', async () => {
    const commit = vi.fn();
    AccountAPI.update.mockResolvedValue({ data: { id: 1 } });
    await accounts.actions.update(
      { commit },
      { name: 'A', options: { silent: true } }
    );
    expect(AccountAPI.update).toHaveBeenCalledWith('', { name: 'A' });
    expect(commit).not.toHaveBeenCalledWith('SET_ACCOUNT_UI_FLAG', {
      isUpdating: true,
    });
  });

  it('returns the cache keys', async () => {
    AccountAPI.getCacheKeys.mockResolvedValue({ data: { inbox: 1 } });
    await expect(store.dispatch('accounts/getCacheKeys')).resolves.toEqual({
      data: { inbox: 1 },
    });
  });
});
