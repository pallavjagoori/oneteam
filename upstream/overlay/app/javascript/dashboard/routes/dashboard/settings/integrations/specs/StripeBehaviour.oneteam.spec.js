/**
 * OneTeam behaviour spec for the Stripe integration settings page.
 *
 * Covers connecting (success and failure), the reconnect button for an
 * account that needs reauthorization, and window focus refreshes.
 */
import { mount, flushPromises } from '@vue/test-utils';
import Stripe from '../Stripe.vue';
import StripeAPI from 'dashboard/api/integrations/stripe';
import IntegrationsAPI from 'dashboard/api/integrations';

const env = vi.hoisted(() => ({ focus: null }));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useEventListener: (target, event, listener) => {
    env.focus = listener;
  },
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ query: {} }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => ({ commit: vi.fn() }),
    useFunctionGetter: () => computed(() => ({ enabled: true })),
    useMapGetter: () => computed(() => ({})),
  };
});
vi.mock('dashboard/api/integrations/stripe', () => ({
  default: { get: vi.fn(), connect: vi.fn(), disconnect: vi.fn() },
}));
vi.mock('dashboard/api/integrations', () => ({ default: { get: vi.fn() } }));

/**
 * Mounts the page and waits for the first load.
 *
 * @returns {Promise<import('@vue/test-utils').VueWrapper>}
 */
const mountPage = async () => {
  const wrapper = mount(Stripe, {
    global: {
      mocks: { $t: key => key },
      stubs: {
        SettingsLayout: {
          template: '<div><slot name="header"/><slot name="body"/></div>',
        },
        BaseSettingsHeader: true,
        Label: { props: ['label'], template: '<span>{{ label }}</span>' },
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('Stripe behaviour', () => {
  const assign = vi.fn();

  beforeEach(() => {
    env.focus = null;
    vi.stubGlobal('location', { ...window.location, assign });
    IntegrationsAPI.get.mockResolvedValue({
      data: { payload: [{ id: 'stripe', enabled: true }] },
    });
    StripeAPI.get.mockResolvedValue({
      data: {
        account_id: 'acct_1',
        connected_at: '2026-09-10T00:00:00Z',
        mode: 'live',
        reauthorization_required: true,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reconnects an account that needs reauthorization', async () => {
    StripeAPI.connect.mockResolvedValue({ data: { url: 'https://stripe' } });
    const wrapper = await mountPage();
    expect(wrapper.text()).toContain(
      'STRIPE_INTEGRATION.REAUTHORIZATION_REQUIRED'
    );
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(assign).toHaveBeenCalledWith('https://stripe');
  });

  it('shows an error when connecting fails', async () => {
    StripeAPI.get.mockResolvedValue({ data: null });
    StripeAPI.connect.mockRejectedValue(new Error('no'));
    const wrapper = await mountPage();
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('STRIPE_INTEGRATION.ERROR');
  });

  it('ignores focus before loading and flags refresh errors', async () => {
    IntegrationsAPI.get.mockRejectedValueOnce(new Error('down'));
    const wrapper = await mountPage();
    await env.focus();
    expect(IntegrationsAPI.get).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('STRIPE_INTEGRATION.ERROR');
  });

  it('flags an error when a focus refresh fails after loading', async () => {
    const wrapper = await mountPage();
    expect(wrapper.text()).not.toContain('STRIPE_INTEGRATION.ERROR');
    IntegrationsAPI.get.mockRejectedValueOnce(new Error('down'));
    await env.focus();
    await flushPromises();
    expect(wrapper.text()).toContain('STRIPE_INTEGRATION.ERROR');
  });
});
