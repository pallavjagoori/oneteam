/**
 * OneTeam behaviour spec for the signup page shell.
 *
 * On Chatwoot-branded installs the page waits for the testimonials to size
 * themselves before showing the form; the Shopify flow keeps its pending
 * install in the login link.
 */
import { shallowMount } from '@vue/test-utils';
import SignupIndex from '../Index.vue';

const env = vi.hoisted(() => ({ config: {} }));

vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => ({ getters: { 'globalConfig/get': env.config } }),
}));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => text }),
}));

const Testimonials = {
  name: 'Testimonials',
  emits: ['resizeContainers'],
  template: '<div class="testimonials" />',
};
const RouterLink = {
  name: 'RouterLink',
  props: { to: { type: Object, default: () => ({}) } },
  template: '<a><slot /></a>',
};

const mountPage = props =>
  shallowMount(SignupIndex, {
    props,
    global: {
      stubs: { Testimonials, RouterLink },
      mocks: { $t: key => key },
    },
  });

describe('Signup page behaviour', () => {
  it('shows the form once the testimonials have resized', async () => {
    env.config = { installationName: 'Chatwoot', logo: '/logo.svg' };
    const wrapper = mountPage();
    expect(wrapper.vm.$.setupState.isLoading).toBe(true);
    await wrapper.findComponent(Testimonials).vm.$emit('resizeContainers');
    expect(wrapper.vm.$.setupState.isLoading).toBe(false);
  });

  it('keeps the Shopify install in the login link on other installs', () => {
    env.config = { installationName: 'Acme', logo: '/logo.svg' };
    const wrapper = mountPage({ shopifyPendingInstall: 'tok' });
    expect(wrapper.vm.$.setupState.isLoading).toBe(false);
    expect(wrapper.findComponent(Testimonials).exists()).toBe(false);
    expect(wrapper.findComponent(RouterLink).props('to')).toEqual({
      name: 'login',
      query: {
        redirect_url:
          'settings/integrations/shopify?shopify_pending_install=tok',
      },
    });
  });
});
