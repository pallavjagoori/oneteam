/**
 * OneTeam behaviour spec for the legacy settings page wrapper.
 *
 * Covers the optional header and rendering the routed page with or
 * without keep-alive.
 */
import { markRaw } from 'vue';
import { mount } from '@vue/test-utils';
import Wrapper from '../Wrapper.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => `t:${key}` }),
}));

const Page = markRaw({ name: 'Page', template: '<p class="page" />' });
const RouterView = {
  name: 'RouterView',
  setup: () => ({ Page }),
  template: '<div><slot :Component="Page" /></div>',
};
const SettingsHeader = {
  name: 'SettingsHeader',
  props: ['headerTitle', 'showBackButton', 'backUrl'],
  template: '<header />',
};

/**
 * Mounts the wrapper.
 *
 * @param {object} props Wrapper props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountWrapper = props =>
  mount(Wrapper, {
    props,
    global: {
      stubs: { RouterView, SettingsHeader },
      mocks: { $route: { fullPath: '/settings/a' } },
    },
  });

describe('settings Wrapper behaviour', () => {
  it('shows the header and keeps the page alive', () => {
    const wrapper = mountWrapper({
      headerTitle: 'INBOX',
      showBackButton: true,
      backUrl: '/back',
    });
    expect(wrapper.getComponent(SettingsHeader).props()).toEqual({
      headerTitle: 't:INBOX',
      showBackButton: true,
      backUrl: '/back',
    });
    expect(wrapper.find('.page').exists()).toBe(true);
  });

  it('shows the header for an icon and renders without keep-alive', () => {
    expect(
      mountWrapper({ icon: 'gear' }).findComponent(SettingsHeader).exists()
    ).toBe(true);
    const wrapper = mountWrapper({ keepAlive: false });
    expect(wrapper.findComponent(SettingsHeader).exists()).toBe(false);
    expect(wrapper.find('.page').exists()).toBe(true);
  });
});
