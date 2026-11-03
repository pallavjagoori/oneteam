/**
 * OneTeam behaviour spec for the Shopify SelectAccount page.
 *
 * Covers the eligible account list, the unavailable message for a bad
 * token or no accounts, and routing to the chosen account.
 */
import { mount } from '@vue/test-utils';
import SelectAccount from '../SelectAccount.vue';

const TOKEN = '0123456789abcdef0123456789abcdef';

const env = vi.hoisted(() => ({
  query: {},
  user: {},
  push: vi.fn(),
}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ query: env.query }),
  useRouter: () => ({ push: env.push }),
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: () => computed(() => env.user) };
});
vi.mock('v3/helpers/AuthHelper', () => ({
  getShopifyInstallAccount: ({ accounts }) =>
    accounts[0].eligible ? accounts[0] : undefined,
  getShopifyInstallPath: (account, redirect) =>
    account.billing ? 'settings/billing' : redirect,
}));

/**
 * Mounts the page.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = () =>
  mount(SelectAccount, {
    global: {
      stubs: {
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

describe('SelectAccount behaviour', () => {
  it('shows unavailable without accounts', () => {
    env.query = { shopify_pending_install: TOKEN };
    env.user = {};
    expect(mountPage().text()).toContain(
      'INTEGRATION_SETTINGS.SHOPIFY.SELECT_ACCOUNT.UNAVAILABLE'
    );
  });

  it('shows unavailable for an invalid token', () => {
    env.query = { shopify_pending_install: 'bad' };
    env.user = { accounts: [{ id: 1, name: 'One', eligible: true }] };
    expect(mountPage().find('button').exists()).toBe(false);
  });

  it('lists eligible accounts and routes to the chosen one', async () => {
    env.query = { shopify_pending_install: TOKEN };
    env.user = {
      accounts: [
        { id: 1, name: 'One', eligible: true },
        { id: 2, name: 'Two', eligible: false },
      ],
    };
    const wrapper = mountPage();
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(1);
    await buttons[0].trigger('click');
    expect(env.push).toHaveBeenCalledWith(
      `/app/accounts/1/settings/integrations/shopify?shopify_pending_install=${TOKEN}`
    );
  });
});
