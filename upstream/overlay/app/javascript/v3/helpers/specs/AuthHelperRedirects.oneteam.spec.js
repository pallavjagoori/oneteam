/**
 * OneTeam spec for the sign-in redirect helpers: the MFA step keeps where
 * the user was going, and Shopify installs on a Shopify-billed account go
 * to billing instead.
 */
import { getMfaSignInURL, getShopifyInstallPath } from '../AuthHelper';

describe('getMfaSignInURL', () => {
  it('returns the login URL unchanged when there is nothing to carry', () => {
    expect(getMfaSignInURL({ loginUrl: '/app/login/mfa' })).toBe(
      '/app/login/mfa'
    );
  });

  it('carries the redirect and SSO account through MFA', () => {
    const url = new URL(
      getMfaSignInURL({
        loginUrl: '/app/login/mfa',
        redirectUrl: 'settings/billing',
        ssoAccountId: '7',
      })
    );
    expect(url.pathname).toBe('/app/login/mfa');
    expect(url.searchParams.get('redirect_url')).toBe('settings/billing');
    expect(url.searchParams.get('sso_account_id')).toBe('7');
    const onlyAccount = new URL(
      getMfaSignInURL({ loginUrl: '/app/login/mfa', ssoAccountId: '7' })
    );
    expect(onlyAccount.searchParams.has('redirect_url')).toBe(false);
  });
});

describe('getShopifyInstallPath', () => {
  const path = 'settings/integrations/shopify?shop=a.myshopify.com';

  it('sends a Shopify-billed account to billing', () => {
    expect(
      getShopifyInstallPath(
        { billing_provider: 'shopify', shopify_integration: true },
        path
      )
    ).toBe('settings/billing?shop=a.myshopify.com');
  });

  it('keeps the integration path for other accounts', () => {
    expect(getShopifyInstallPath({ billing_provider: 'stripe' }, path)).toBe(
      path
    );
  });
});
