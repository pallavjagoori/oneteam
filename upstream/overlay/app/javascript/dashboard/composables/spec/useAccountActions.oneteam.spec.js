import { useAccount } from '../useAccount';

/*
 * OneTeam coverage for the useAccount helpers Chatwoot's spec leaves out:
 * the cloud feature check, account-scoped routes and the update and
 * onboarding actions.
 */
const ctx = vi.hoisted(() => ({ dispatch: vi.fn(), isEnabled: vi.fn() }));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: '4' } }),
}));
vi.mock('../store', () => ({
  useStore: () => ({ dispatch: ctx.dispatch }),
  useMapGetter: name =>
    ({
      'accounts/getAccount': { value: id => ({ id }) },
      'accounts/isFeatureEnabledonAccount': { value: ctx.isEnabled },
    })[name] || { value: false },
}));

describe('useAccount actions (OneTeam)', () => {
  it('checks a feature on the current account', () => {
    ctx.isEnabled.mockReturnValue(true);
    expect(useAccount().isCloudFeatureEnabled('sla')).toBe(true);
    expect(ctx.isEnabled).toHaveBeenCalledWith(4, 'sla');
  });

  it('builds account-scoped routes', () => {
    expect(
      useAccount().accountScopedRoute('home', { id: 1 }, { page: 2 })
    ).toEqual({
      name: 'home',
      params: { accountId: 4, id: 1 },
      query: { page: 2 },
    });
  });

  it('updates the account and finishes onboarding through the store', async () => {
    const account = useAccount();
    await account.updateAccount({ name: 'Acme' }, { silent: true });
    expect(ctx.dispatch).toHaveBeenCalledWith('accounts/update', {
      name: 'Acme',
      options: { silent: true },
    });
    await account.finishOnboarding({ step: 'done' });
    expect(ctx.dispatch).toHaveBeenCalledWith('accounts/finishOnboarding', {
      step: 'done',
    });
  });
});
