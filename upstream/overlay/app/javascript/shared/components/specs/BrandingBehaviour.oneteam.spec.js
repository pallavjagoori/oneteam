/**
 * OneTeam behaviour spec for the "Powered by" branding link.
 *
 * Covers hiding it without a brand name or when disabled, the widget and
 * survey tracking parameters, and the empty link when the store getter or
 * the brand URL is unusable.
 */
import { mount } from '@vue/test-utils';

vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `${text}!` }),
}));

const loadBranding = async config => {
  vi.resetModules();
  window.globalConfig = config;
  return (await import('../Branding.vue')).default;
};
const mountBranding = (Branding, { props = {}, referrer, store = true } = {}) =>
  mount(Branding, {
    props,
    global: {
      mocks: store
        ? { $store: { getters: { 'appConfig/getReferrerHost': referrer } } }
        : {},
    },
  });

describe('Branding behaviour', () => {
  afterAll(() => {
    delete window.globalConfig;
  });

  it('hides without a brand name or when disabled', async () => {
    const Bare = await loadBranding(undefined);
    expect(mountBranding(Bare).find('a').exists()).toBe(false);
    const Branding = await loadBranding({ BRAND_NAME: 'Acme' });
    expect(
      mountBranding(Branding, { props: { disableBranding: true } })
        .find('a')
        .exists()
    ).toBe(false);
  });

  it('links with widget or survey tracking', async () => {
    const Branding = await loadBranding({
      BRAND_NAME: 'Acme',
      LOGO_THUMBNAIL: 'logo.png',
      WIDGET_BRAND_URL: 'https://acme.test/',
    });
    const widget = mountBranding(Branding, { referrer: 'shop.test' });
    expect(widget.find('a').attributes('href')).toBe(
      'https://acme.test/?utm_source=shop.test&utm_medium=widget&utm_campaign=branding'
    );
    expect(widget.find('img').attributes()).toMatchObject({
      alt: 'Acme',
      src: 'logo.png',
    });
    expect(widget.find('span').text()).toBe('POWERED_BY!');
    expect(mountBranding(Branding).find('a').attributes('href')).toBe(
      'https://acme.test/?utm_medium=survey&utm_campaign=branding'
    );
    expect(
      mountBranding(Branding, { store: false }).find('a').attributes('href')
    ).toBe('');
  });
});
