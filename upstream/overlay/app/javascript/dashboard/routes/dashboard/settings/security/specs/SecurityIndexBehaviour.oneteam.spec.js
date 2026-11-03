/**
 * OneTeam behaviour spec for the security settings page.
 *
 * Covers the MFA section, the SAML paywall, SAML settings, the disabled
 * SAML message and the no-settings message.
 */
import { mount } from '@vue/test-utils';
import SecurityIndex from '../Index.vue';

const policy = vi.hoisted(() => ({ show: false, paywall: false }));

vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({
    shouldShow: () => policy.show,
    shouldShowPaywall: () => policy.paywall,
  }),
}));

/**
 * Mounts the page for a config.
 *
 * @param {object} config window.chatwootConfig values
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = config => {
  window.chatwootConfig = config;
  return mount(SecurityIndex, {
    global: {
      mocks: { $t: key => key },
      stubs: {
        SettingsLayout: {
          template: '<div><slot name="header" /><slot name="body" /></div>',
        },
        BaseSettingsHeader: true,
        EnforceMfa: { template: '<div class="mfa" />' },
        SamlPaywall: { template: '<div class="paywall" />' },
        SamlSettings: { template: '<div class="saml" />' },
      },
    },
  });
};

describe('Security settings page behaviour', () => {
  beforeEach(() => {
    policy.show = false;
    policy.paywall = false;
  });

  afterEach(() => {
    window.chatwootConfig = {};
  });

  it('shows the no-settings message without MFA or SAML', () => {
    const wrapper = mountPage({});
    expect(wrapper.find('.mfa').exists()).toBe(false);
    expect(wrapper.text()).toContain('SECURITY_SETTINGS.NO_SETTINGS_AVAILABLE');
  });

  it('shows MFA when enabled', () => {
    const wrapper = mountPage({ isMfaEnabled: 'true' });
    expect(wrapper.find('.mfa').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('NO_SETTINGS_AVAILABLE');
  });

  it('shows the paywall', () => {
    policy.paywall = true;
    expect(mountPage({}).find('.paywall').exists()).toBe(true);
  });

  it('shows SAML settings when SAML login is allowed', () => {
    policy.show = true;
    const wrapper = mountPage({ allowedLoginMethods: ['email', 'saml'] });
    expect(wrapper.find('.saml').exists()).toBe(true);
  });

  it('shows the disabled message when SAML login is off', () => {
    policy.show = true;
    const wrapper = mountPage({ allowedLoginMethods: ['email'] });
    expect(wrapper.text()).toContain('SECURITY_SETTINGS.SAML_DISABLED_MESSAGE');
  });
});
