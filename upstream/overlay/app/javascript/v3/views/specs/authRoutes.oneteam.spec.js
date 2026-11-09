/**
 * OneTeam spec for the v3 auth routes.
 *
 * Covers the props each auth route reads from the query string or the
 * history state, including their fallbacks.
 */
import routes from '../routes';

vi.mock('../../helpers/AuthHelper', () => ({
  getShopifyBillingRedirect: query => (query.shop ? 'shopify' : undefined),
}));

/**
 * Finds a route's props function by route name.
 *
 * @param {string} name route name
 * @returns {Function}
 */
const propsOf = name => routes.find(route => route.name === name).props;

const query = {
  config: 'c',
  email: 'e',
  sso_auth_token: 't',
  sso_account_id: '1',
  sso_conversation_id: '2',
  error: 'err',
  target: 'tg',
  redirect_url: '/r',
  route_url: '/ru',
  confirmation_token: 'ct',
  reset_password_token: 'rt',
  shopify_pending_install: 'yes',
};

describe('v3 auth routes', () => {
  it('maps the login query and falls back to the Shopify redirect', () => {
    expect(propsOf('login')({ query })).toEqual({
      config: 'c',
      email: 'e',
      ssoAuthToken: 't',
      ssoAccountId: '1',
      ssoConversationId: '2',
      authError: 'err',
      redirectUrl: '/r',
    });
    expect(propsOf('login')({ query: { shop: 'x' } }).redirectUrl).toBe(
      'shopify'
    );
  });

  it('maps the SSO, signup, confirmation, password and reset queries', () => {
    expect(propsOf('sso_login')({ query })).toEqual({
      authError: 'err',
      target: 'tg',
      ssoAccountId: '1',
      redirectUrl: '/r',
    });
    expect(propsOf('auth_signup')({ query })).toEqual({
      shopifyPendingInstall: 'yes',
    });
    expect(propsOf('auth_confirmation')({ query })).toEqual({
      config: 'c',
      confirmationToken: 'ct',
      ssoAccountId: '1',
      redirectUrl: '/ru',
    });
    expect(propsOf('auth_password_edit')({ query })).toEqual({
      config: 'c',
      resetPasswordToken: 'rt',
      ssoAccountId: '1',
      redirectUrl: '/ru',
    });
    expect(propsOf('auth_reset_password')({ query })).toEqual({
      redirectUrl: '/r',
      ssoAccountId: '1',
    });
  });

  it('reads the verify email props from the history state', () => {
    window.history.replaceState({ email: 'a@b.c', redirectUrl: '/x' }, '');
    expect(propsOf('auth_verify_email')()).toEqual({
      email: 'a@b.c',
      redirectUrl: '/x',
    });
    window.history.replaceState(null, '');
    expect(propsOf('auth_verify_email')()).toEqual({
      email: '',
      redirectUrl: '',
    });
  });
});
