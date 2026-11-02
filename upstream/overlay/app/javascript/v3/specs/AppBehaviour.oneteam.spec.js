/**
 * OneTeam behaviour spec for the root component of the v3 auth app
 * (login, signup and password pages).
 *
 * Covers following the system colour scheme on mount and when it
 * changes (adding or removing the `dark` class on the page), and applying
 * the installation's selected locale (or keeping the default when none is
 * set).
 */
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import App from '../App.vue';

let mql;

const mountApp = (dark, selectedLocale) => {
  mql = { matches: dark, onchange: null };
  window.matchMedia = vi.fn(() => mql);
  window.chatwootConfig = { selectedLocale };
  const i18n = createI18n({ legacy: false, locale: 'en', messages: {} });
  const wrapper = mount(App, {
    global: {
      plugins: [i18n],
      stubs: { RouterView: true, SnackbarContainer: true },
    },
  });
  return { wrapper, i18n };
};

describe('v3 App behaviour', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('follows a dark system theme and its changes', async () => {
    const { wrapper, i18n } = mountApp(true, 'fr');
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(i18n.global.locale.value).toBe('fr');

    mql.onchange({ matches: false });
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    mql.onchange({ matches: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('starts light and keeps the default locale', async () => {
    document.documentElement.classList.add('dark');
    const { wrapper, i18n } = mountApp(false, undefined);
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(i18n.global.locale.value).toBe('en');
  });
});
