import {
  defaultRedirectPage,
  getConversationDashboardRoute,
  isAConversationRoute,
  isUpgradePageBypassRoute,
  validateLoggedInRoutes,
} from '../routeHelpers';
import { buildPortalURL, getArticleStatus } from '../portalHelper';

describe('routeHelpers (OneTeam)', () => {
  const to = (name, permissions) => ({
    name,
    params: { accountId: '1' },
    meta: { permissions },
  });
  const user = (account, permissions = ['administrator']) => ({
    accounts: [{ id: 1, permissions, ...account }],
  });

  it('falls back to the dashboard when no permission matches', () => {
    expect(defaultRedirectPage(to('x'), [])).toBe('accounts/1/dashboard');
  });

  describe('Shopify billing accounts that need a plan', () => {
    const shopify = {
      status: 'active',
      billing_provider: 'shopify',
      shopify_integration: true,
      subscription_status: 'pending',
    };

    it('sends administrators to billing', () => {
      expect(validateLoggedInRoutes(to('home'), user(shopify))).toBe(
        'accounts/1/settings/billing'
      );
      expect(
        validateLoggedInRoutes(to('billing_settings_index'), user(shopify))
      ).toBeNull();
    });

    it('sends agents to the suspended page', () => {
      expect(validateLoggedInRoutes(to('home'), user(shopify, ['agent']))).toBe(
        'accounts/1/suspended'
      );
      expect(
        validateLoggedInRoutes(
          to('account_suspended'),
          user(shopify, ['agent'])
        )
      ).toBeNull();
    });
  });

  it('lets administrators of suspended accounts reach billing', () => {
    expect(
      validateLoggedInRoutes(
        to('billing_settings_index'),
        user({ status: 'suspended' })
      )
    ).toBeNull();
  });

  it('lets a few settings pages bypass the upgrade page', () => {
    expect(isUpgradePageBypassRoute('agent_list')).toBe(true);
    expect(isUpgradePageBypassRoute('home')).toBe(false);
  });

  it('can leave out the extended conversation routes', () => {
    expect(isAConversationRoute('inbox_conversation', false, false)).toBe(
      false
    );
  });

  it.each([
    ['conversations_through_folders', 'folder_conversations'],
    ['conversation_through_participating', 'conversation_participating'],
  ])('maps %s back to its list', (route, list) => {
    expect(getConversationDashboardRoute(route)).toBe(list);
  });
});

describe('portalHelper (OneTeam)', () => {
  afterEach(() => {
    delete window.chatwootConfig;
  });

  it('keeps an https custom domain as it is', () => {
    expect(buildPortalURL('docs', 'https://help.example.com')).toBe(
      'https://help.example.com/hc/docs'
    );
  });

  it('uses the help center URL, then the host URL', () => {
    window.chatwootConfig = {
      hostURL: 'https://app.example.com',
      helpCenterURL: 'https://help.example.com',
    };
    expect(buildPortalURL('docs')).toBe('https://help.example.com/hc/docs');
    window.chatwootConfig = { hostURL: 'https://app.example.com' };
    expect(buildPortalURL('docs')).toBe('https://app.example.com/hc/docs');
  });

  it('fails without any base URL', () => {
    expect(() => buildPortalURL('docs')).toThrow(
      'No valid base URL found in configuration'
    );
    window.chatwootConfig = {};
    expect(() => buildPortalURL('docs')).toThrow();
  });

  it('maps article statuses to numbers', () => {
    expect(
      ['draft', 'published', 'archived', 'other'].map(getArticleStatus)
    ).toEqual([0, 1, 2, undefined]);
  });
});
