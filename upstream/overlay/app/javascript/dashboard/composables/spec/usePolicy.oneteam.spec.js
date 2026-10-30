import { ref } from 'vue';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { usePolicy } from '../usePolicy';

/*
 * OneTeam coverage for usePolicy, which decides whether a sidebar item or
 * page is shown and whether it shows a paywall. The answer depends on the
 * user's permissions, the installation type (community, enterprise, cloud),
 * custom branding and the account's feature flags; each test sets those
 * through fake getters and config.
 */
const ctx = vi.hoisted(() => ({
  getters: {},
  config: { isEnterprise: false, enterprisePlanName: 'community' },
}));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => ctx.getters[name],
}));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ctx.config,
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { ref: vueRef } = await import('vue');
  return { useAccount: () => ({ accountId: vueRef(1) }) };
});

const PREMIUM = FEATURE_FLAGS.SLA;
const PAYWALLED = FEATURE_FLAGS.COMPANIES;
const PLAIN = FEATURE_FLAGS.MACROS;

const setup = ({
  cloud = false,
  branded = false,
  enterprise = false,
  plan = 'community',
  enabled = [],
  permissions = ['administrator'],
} = {}) => {
  ctx.config = { isEnterprise: enterprise, enterprisePlanName: plan };
  ctx.getters = {
    getCurrentUser: ref({ accounts: [{ id: 1, permissions }] }),
    'accounts/isFeatureEnabledonAccount': ref((_, flag) =>
      enabled.includes(flag)
    ),
    'globalConfig/isOnChatwootCloud': ref(cloud),
    'globalConfig/isACustomBrandedInstance': ref(branded),
  };
  return usePolicy();
};

describe('usePolicy (OneTeam)', () => {
  describe('building blocks', () => {
    it('treats a missing flag or permission list as allowed', () => {
      const policy = setup({ permissions: ['agent'] });
      expect(policy.isFeatureFlagEnabled()).toBe(true);
      expect(policy.checkPermissions()).toBe(true);
      expect(policy.checkPermissions([])).toBe(true);
      expect(policy.checkPermissions(['agent'])).toBe(true);
      expect(policy.checkPermissions(['administrator'])).toBe(false);
    });

    it('matches the installation type', () => {
      expect(setup().checkInstallationType(['cloud'])).toBe(false);
      expect(setup({ cloud: true }).checkInstallationType(['cloud'])).toBe(
        true
      );
      expect(
        setup({ enterprise: true }).checkInstallationType(['enterprise'])
      ).toBe(true);
      expect(setup().checkInstallationType(['community'])).toBe(true);
      expect(setup().checkInstallationType([])).toBe(true);
      expect(setup().checkInstallationType(undefined)).toBe(true);
    });
  });

  describe('shouldShow', () => {
    it('hides items the user may not use or the installation lacks', () => {
      expect(
        setup({ permissions: [] }).shouldShow(PLAIN, ['administrator'])
      ).toBe(false);
      expect(setup().shouldShow(PLAIN, [], ref(['cloud']))).toBe(false);
    });

    it('follows only the feature flag on a custom branded instance', () => {
      const policy = setup({ branded: true, cloud: true, enabled: [PLAIN] });
      expect(policy.shouldShow(PLAIN)).toBe(true);
      expect(policy.shouldShow(PREMIUM)).toBe(false);
    });

    it('on cloud shows enabled, premium and paywalled features', () => {
      const policy = setup({ cloud: true, enabled: [PLAIN] });
      expect(policy.shouldShow(PLAIN)).toBe(true);
      expect(policy.shouldShow(PREMIUM)).toBe(true);
      expect(policy.shouldShow(PAYWALLED)).toBe(true);
      expect(policy.shouldShow('disabled_flag')).toBe(false);
      expect(policy.shouldShow(undefined)).toBe(true);
    });

    it('on enterprise shows premium features as upsells until a plan is bought', () => {
      const community = setup({ enterprise: true });
      expect(community.shouldShow(PREMIUM)).toBe(true);
      expect(community.shouldShow(PLAIN)).toBe(false);
      const premium = setup({ enterprise: true, plan: 'enterprise' });
      expect(premium.shouldShow(PREMIUM)).toBe(false);
      expect(
        setup({
          enterprise: true,
          plan: 'enterprise',
          enabled: [PREMIUM],
        }).shouldShow(PREMIUM)
      ).toBe(true);
    });

    it('shows everything on a community installation', () => {
      expect(setup().shouldShow(PREMIUM)).toBe(true);
    });
  });

  describe('shouldShowPaywall', () => {
    it('never shows a paywall without a flag or on a branded instance', () => {
      expect(setup().shouldShowPaywall(undefined)).toBe(false);
      expect(
        setup({ branded: true, cloud: true }).shouldShowPaywall(PREMIUM)
      ).toBe(false);
    });

    it('paywalls cloud-only features on cloud until enabled', () => {
      expect(setup({ cloud: true }).shouldShowPaywall(ref(PAYWALLED))).toBe(
        true
      );
      expect(
        setup({ cloud: true, enabled: [PAYWALLED] }).shouldShowPaywall(
          PAYWALLED
        )
      ).toBe(false);
      expect(setup().shouldShowPaywall(PAYWALLED)).toBe(false);
    });

    it('paywalls premium features on cloud and on enterprise without a plan', () => {
      expect(setup({ cloud: true }).shouldShowPaywall(PREMIUM)).toBe(true);
      expect(
        setup({ cloud: true, enabled: [PREMIUM] }).shouldShowPaywall(PREMIUM)
      ).toBe(false);
      expect(setup({ enterprise: true }).shouldShowPaywall(PREMIUM)).toBe(true);
      expect(
        setup({ enterprise: true, plan: 'enterprise' }).shouldShowPaywall(
          PREMIUM
        )
      ).toBe(false);
      expect(setup().shouldShowPaywall(PREMIUM)).toBe(false);
      expect(setup({ cloud: true }).shouldShowPaywall(PLAIN)).toBe(false);
    });
  });
});
