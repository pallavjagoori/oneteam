/**
 * OneTeam behaviour spec for the Shopify billing page.
 *
 * Complements Chatwoot's own spec with every subscription status label,
 * the plan name fallback, prices without an amount or currency or with
 * an unknown period, trials with and without an end date, summaries
 * without dates or manage rights, and reconnecting a pending Shopify
 * install (including a 422 that is ignored and other errors).
 */
import { flushPromises, mount } from '@vue/test-utils';
import ShopifyBilling from '../ShopifyBilling.vue';

const env = vi.hoisted(() => ({
  route: { query: {}, params: { accountId: 1 } },
  replace: vi.fn(),
  dispatch: vi.fn(),
  summary: vi.fn(),
  reconnect: vi.fn(),
}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => ({ replace: env.replace }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('dashboard/api/enterprise/account', () => ({
  default: {
    billingSummary: (...args) => env.summary(...args),
    reconnectShopify: (...args) => env.reconnect(...args),
  },
}));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => text }),
}));

const DetailItem = {
  name: 'DetailItem',
  props: ['label', 'value'],
  template: '<dl>{{ [label, value].join(sep) }}</dl>',
  data: () => ({ sep: '=' }),
};

const render = async (data, query = {}) => {
  env.route = { query, params: { accountId: 1 } };
  env.summary = vi.fn().mockResolvedValue({ data });
  const wrapper = mount(ShopifyBilling, {
    global: {
      stubs: {
        SettingsLayout: {
          template: '<div><slot name="header" /><slot name="body" /></div>',
        },
        BaseSettingsHeader: true,
        BillingCard: {
          template: '<div><slot name="action" /><slot /></div>',
        },
        DetailItem,
        ButtonV4: { template: '<button><slot /></button>' },
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const values = wrapper =>
  wrapper.findAllComponents(DetailItem).map(item => item.props('value'));

describe('ShopifyBilling behaviour', () => {
  beforeEach(() => {
    env.replace = vi.fn();
    env.dispatch = vi.fn().mockResolvedValue();
    env.reconnect = vi.fn().mockResolvedValue();
  });

  it('labels every subscription state', async () => {
    const states = {
      trialing: 'TRIALING',
      cancelled: 'CANCELLED',
      expired: 'EXPIRED',
      missing: 'MISSING',
      weird: 'PENDING',
    };
    await Object.entries(states).reduce(async (previous, [state, label]) => {
      await previous;
      const wrapper = await render({ state });
      expect(values(wrapper)).toEqual([
        `BILLING_SETTINGS.SHOPIFY.STATUS.${label}`,
        `BILLING_SETTINGS.SHOPIFY.STATUS.${label}`,
      ]);
      expect(wrapper.find('button').exists()).toBe(false);
    }, Promise.resolve());
    expect(values(await render({}))[0]).toBe(
      'BILLING_SETTINGS.SHOPIFY.STATUS.PENDING'
    );
  });

  it('formats prices and dates in each shape', async () => {
    const base = { plan: { name: 'Pro' }, currency: 'USD' };
    expect(values(await render({ ...base, amount: null }))).toHaveLength(2);
    expect(
      values(await render({ ...base, amount: 5, currency: '' }))
    ).toHaveLength(2);
    const plain = await render({
      ...base,
      amount: 5,
      billing_period: 'WEEKLY',
    });
    expect(values(plain)[2]).toContain('5.00');
    expect(values(await render({ ...base, amount: 5 }))[2]).toContain('5.00');

    const trial = await render({
      state: 'trialing',
      trial_ends_at: '2026-01-02T00:00:00Z',
      allowed_actions: { manage_subscription: true },
    });
    expect(trial.text()).toContain('TRIAL_ENDS_ON=02 Jan, 2026');
    expect(trial.find('button').text()).toBe(
      'BILLING_SETTINGS.SHOPIFY.MANAGE_PLAN'
    );
    const openTrial = await render({ state: 'trialing' });
    expect(openTrial.text()).not.toContain('TRIAL_ENDS_ON');
  });

  it('reconnects a pending Shopify install', async () => {
    const query = { shopify_pending_install: 'abc', tab: 'x' };
    await render({ state: 'active' }, query);
    expect(env.reconnect).toHaveBeenCalledWith('abc');
    expect(env.replace).toHaveBeenCalledWith({ query: { tab: 'x' } });

    env.reconnect = vi.fn().mockRejectedValue({ response: { status: 422 } });
    const handled = await render({ state: 'active' }, query);
    expect(handled.text()).not.toContain('ERROR_TITLE');

    env.reconnect = vi.fn().mockRejectedValue({ response: { status: 500 } });
    const failed = await render({ state: 'active' }, query);
    expect(failed.text()).toContain('BILLING_SETTINGS.SHOPIFY.ERROR_TITLE');

    env.reconnect = vi.fn().mockRejectedValue(new Error('offline'));
    expect((await render({}, query)).text()).toContain('ERROR_TITLE');
  });
});
