/**
 * OneTeam spec for the dashboard's route guard paths the upstream spec
 * leaves out: users without accounts, onboarding, unpaid Shopify accounts,
 * and the beforeEach hook that waits for the signed-in user.
 */
import store from 'dashboard/store';
import AnalyticsHelper from 'dashboard/helper/AnalyticsHelper';
import {
  router,
  validateAuthenticateRoutePermission,
  initalizeRouter,
} from '../index';

vi.mock('dashboard/store', () => ({
  default: { getters: {}, dispatch: vi.fn(() => Promise.resolve()) },
}));
vi.mock('dashboard/helper/AnalyticsHelper', () => ({
  default: { page: vi.fn() },
}));

const signIn = accounts => {
  store.getters = {
    isLoggedIn: true,
    getCurrentUser: { id: 1, account_id: 1, accounts },
  };
};
const admin = (extra = {}) => ({
  id: 1,
  role: 'administrator',
  status: 'active',
  permissions: ['administrator'],
  ...extra,
});

let next;
beforeEach(() => {
  next = vi.fn();
});

describe('users without accounts', () => {
  beforeEach(() => signIn([]));

  it('sends them to the no-accounts page', () => {
    validateAuthenticateRoutePermission({ name: 'home', query: {} }, next);
    expect(next).toHaveBeenCalledWith('/app/no-accounts');
  });

  it('lets them stay on the no-accounts page', () => {
    validateAuthenticateRoutePermission(
      { name: 'no_accounts', query: {} },
      next
    );
    expect(next).toHaveBeenCalledWith();
  });
});

describe('landing without a route name', () => {
  it('sends an unpaid Shopify admin to billing', () => {
    signIn([
      admin({
        billing_provider: 'shopify',
        shopify_integration: true,
        subscription_status: 'pending',
      }),
    ]);
    validateAuthenticateRoutePermission({ query: {}, params: {} }, next);
    expect(next).toHaveBeenCalledWith('/app/accounts/1/settings/billing');
  });

  it('sends an admin mid-onboarding to the right onboarding step', () => {
    signIn([admin({ onboarding_step: 'inbox_setup' })]);
    validateAuthenticateRoutePermission({ query: {}, params: {} }, next);
    expect(next).toHaveBeenCalledWith('/app/accounts/1/onboarding/inbox-setup');
    signIn([admin({ onboarding_step: 'account_details' })]);
    validateAuthenticateRoutePermission({ query: {}, params: {} }, next);
    expect(next).toHaveBeenLastCalledWith('/app/accounts/1/onboarding');
  });
});

describe('named routes', () => {
  it('keeps an admin on onboarding until it is finished', () => {
    signIn([admin({ onboarding_step: 'enrichment' })]);
    validateAuthenticateRoutePermission(
      { name: 'home', query: {}, params: { accountId: '1' } },
      next
    );
    expect(next).toHaveBeenCalledWith('/app/accounts/1/onboarding');
  });

  it('moves a user off onboarding pages once onboarding is done', () => {
    signIn([admin()]);
    validateAuthenticateRoutePermission(
      {
        name: 'onboarding_account_details',
        query: {},
        params: { accountId: '1' },
      },
      next
    );
    expect(next).toHaveBeenCalledWith('/app/accounts/1/dashboard');
  });
});

describe('initalizeRouter', () => {
  it('loads the user once, tracks each page and then runs the guard', async () => {
    signIn([admin()]);
    let guard;
    vi.spyOn(router, 'beforeEach').mockImplementation(fn => {
      guard = fn;
    });
    initalizeRouter();
    expect(store.dispatch).toHaveBeenCalledWith('setUser');
    await guard(
      { name: 'no_accounts', path: '/app/no-accounts', query: {}, params: {} },
      {},
      next
    );
    expect(AnalyticsHelper.page).toHaveBeenCalledWith('no_accounts', {
      path: '/app/no-accounts',
      name: 'no_accounts',
    });
    expect(next).toHaveBeenCalledWith('/app/accounts/1/dashboard');
    await guard({ path: '/app', query: {}, params: {} }, {}, next);
    expect(AnalyticsHelper.page).toHaveBeenLastCalledWith('', {
      path: '/app',
      name: undefined,
    });
  });
});
