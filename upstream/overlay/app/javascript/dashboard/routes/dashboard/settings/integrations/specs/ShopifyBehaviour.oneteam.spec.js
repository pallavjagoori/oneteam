/**
 * OneTeam behaviour spec for the Shopify integration settings page.
 *
 * Covers loading the integration, connected vs connectable states, the
 * help text with the store domain, Shopify-billed accounts (no connect
 * button), validating and connecting a store URL (success, invalid
 * domain, API failure, resetting the dialog), completing a pending
 * install from the URL (success, generic and 422 failures) and the
 * error banner.
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import shopifyAPI from 'dashboard/api/integrations/shopify';
import { useAlert } from 'dashboard/composables';
import Shopify from '../Shopify.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.getters[name]),
  useFunctionGetter: () => computed(() => env.getters.integration),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => text }),
}));
vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({ formatMessage: text => `<p>${text}</p>` }),
}));
vi.mock('v3/helpers/AuthHelper', () => ({
  isShopifyBillingAccount: account => !!account?.shopifyBilled,
}));
vi.mock('dashboard/api/integrations/shopify', () => ({
  default: { connect: vi.fn(), completeInstall: vi.fn() },
}));

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading'],
  template: '<div><slot name="header" /><slot name="body" /></div>',
};
const Integration = {
  name: 'Integration',
  props: [
    'integrationId',
    'integrationEnabled',
    'integrationAction',
    'hideEnabledAction',
  ],
  template: '<div><slot name="action" /></div>',
};
const Dialog = {
  name: 'Dialog',
  props: ['isLoading'],
  emits: ['confirm', 'close'],
  methods: { open: () => env.dialogOpen() },
  template: '<div><slot /></div>',
};
const NextInput = {
  name: 'Input',
  props: ['modelValue', 'message', 'messageType'],
  emits: ['update:modelValue'],
  template: '<input />',
};
const NextButton = {
  name: 'Button',
  props: ['label'],
  template: '<button>{{ label }}</button>',
};

const mountPage = ({
  integration = { id: 'shopify', enabled: false, action: 'connect' },
  query = {},
  account = {},
  error = '',
} = {}) => {
  env.route = reactive({ query });
  env.router = { replace: vi.fn() };
  env.store = { dispatch: vi.fn() };
  env.getters = reactive({
    integration,
    'integrations/getUIFlags': { isCreatingShopify: false },
    getCurrentAccount: account,
  });
  return mount(Shopify, {
    props: { error },
    global: {
      stubs: {
        SettingsLayout: Layout,
        Integration,
        Dialog,
        Input: NextInput,
        Button: NextButton,
        BaseSettingsHeader: true,
      },
      directives: {
        dompurifyHtml: (el, { value }) => {
          el.innerHTML = value;
        },
      },
    },
  });
};

const confirmWith = async (wrapper, url) => {
  await wrapper.findComponent(NextInput).vm.$emit('update:modelValue', url);
  await wrapper.findComponent(Dialog).vm.$emit('confirm');
  await flushPromises();
};

describe('Shopify settings behaviour', () => {
  beforeEach(() => {
    env.dialogOpen = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: vi.fn() },
    });
  });

  it('loads the integration and offers to connect', async () => {
    const wrapper = mountPage();
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(true);
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'integrations/get',
      'shopify'
    );
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(false);
    expect(wrapper.findComponent(Integration).props('integrationAction')).toBe(
      'connect'
    );
    expect(wrapper.text()).not.toContain('HELP_TEXT.TITLE');
    await wrapper.find('button').trigger('click');
    expect(env.dialogOpen).toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('INTEGRATION_SETTINGS.SHOPIFY.ERROR');
  });

  it('shows the connected store and hides the button for Shopify billing', async () => {
    const wrapper = mountPage({
      integration: {
        id: 'shopify',
        enabled: true,
        hooks: [{ reference_id: 'shop.myshopify.com' }],
      },
      account: { shopifyBilled: true },
      error: 'denied',
    });
    await flushPromises();
    expect(wrapper.findComponent(Integration).props()).toMatchObject({
      integrationAction: 'disconnect',
      hideEnabledAction: true,
    });
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.text()).toContain(
      'INTEGRATION_SETTINGS.SHOPIFY.HELP_TEXT.TITLE'
    );
    expect(wrapper.text()).toContain('INTEGRATION_SETTINGS.SHOPIFY.ERROR');
    expect(
      mountPage({ integration: { enabled: true, hooks: [{}] } }).text()
    ).toContain('HELP_TEXT.TITLE');
    expect(mountPage({ integration: { enabled: true } }).text()).toContain(
      'HELP_TEXT.TITLE'
    );
  });

  it('validates and connects a store', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const input = () => wrapper.findComponent(NextInput);
    expect(input().props('messageType')).toBe('info');
    await confirmWith(wrapper, 'not a shop');
    expect(input().props()).toMatchObject({
      message: 'INTEGRATION_SETTINGS.SHOPIFY.STORE_URL.INVALID_URL',
      messageType: 'error',
    });
    expect(shopifyAPI.connect).not.toHaveBeenCalled();

    shopifyAPI.connect.mockResolvedValue({
      data: { redirect_url: 'https://shopify/auth' },
    });
    await confirmWith(wrapper, '  My-Shop.myshopify.com ');
    expect(shopifyAPI.connect).toHaveBeenCalledWith('my-shop.myshopify.com');
    expect(window.location.assign).toHaveBeenCalledWith('https://shopify/auth');
    expect(wrapper.findComponent(Dialog).props('isLoading')).toBe(false);

    shopifyAPI.connect.mockRejectedValue(new Error('down'));
    await confirmWith(wrapper, 'shop.myshopify.io');
    expect(input().props('message')).toBe('INTEGRATION_SETTINGS.SHOPIFY.ERROR');

    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(input().props()).toMatchObject({
      modelValue: '',
      messageType: 'info',
    });
  });

  it('completes a pending install from the link', async () => {
    shopifyAPI.completeInstall.mockResolvedValue({});
    mountPage({ query: { shopify_pending_install: 'tok', tab: 'x' } });
    await flushPromises();
    expect(shopifyAPI.completeInstall).toHaveBeenCalledWith('tok');
    expect(env.store.dispatch).toHaveBeenCalledTimes(2);
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.SHOPIFY.PENDING_INSTALL.SUCCESS'
    );
    expect(env.router.replace).toHaveBeenCalledWith({ query: { tab: 'x' } });
  });

  it('keeps or clears the install token after failures', async () => {
    shopifyAPI.completeInstall.mockRejectedValue(new Error('down'));
    mountPage({ query: { shopify_pending_install: 'tok' } });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.SHOPIFY.PENDING_INSTALL.ERROR'
    );
    expect(env.router.replace).not.toHaveBeenCalled();

    shopifyAPI.completeInstall.mockRejectedValue({ response: { status: 422 } });
    mountPage({ query: { shopify_pending_install: 'tok' } });
    await flushPromises();
    expect(env.router.replace).toHaveBeenCalledWith({ query: {} });
  });
});
