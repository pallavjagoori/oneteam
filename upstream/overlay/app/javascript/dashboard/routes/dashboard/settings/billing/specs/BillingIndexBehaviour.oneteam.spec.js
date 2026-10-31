/**
 * OneTeam behaviour spec for the billing settings page.
 *
 * Account, Captain, payment status, store and session storage are
 * faked. Covers sending self-hosted users home, waiting once for a new
 * cloud subscription, choosing a billing currency, plan details (seats,
 * renewal, cancellation, currency), the past-due banner, Captain credit
 * meters and top-ups, and the chat and billing portal buttons.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import sessionStorage from 'shared/helpers/sessionStorage';
import BillingIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store.js', () => ({
  useStore: () => env.store,
  useMapGetter: () => env.uiFlags,
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    currentAccount: env.account,
    isOnChatwootCloud: env.cloud,
  }),
}));
vi.mock('dashboard/composables/usePaymentStatus', () => ({
  usePaymentStatus: () => ({ isPastDue: env.pastDue }),
}));
vi.mock('dashboard/composables/useCaptain', () => ({
  useCaptain: () => env.captain,
}));
vi.mock('shared/helpers/sessionStorage', () => ({
  default: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
}));

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading', 'loadingMessage', 'noRecordsFound'],
  template: '<div><slot name="header" /><slot name="body" /></div>',
};
const ButtonV4 = {
  name: 'ButtonV4',
  props: ['isLoading', 'disabled'],
  emits: ['click'],
  template: '<button class="btn" @click="$emit(`click`)"><slot /></button>',
};
const Detail = {
  name: 'DetailItem',
  props: ['label', 'value'],
  template: '<dl />',
};
const Meter = { name: 'BillingMeter', props: ['title'], template: '<meter />' };
const Card = {
  name: 'BillingCard',
  props: ['title', 'description'],
  template: '<section class="card"><slot name="action" /><slot /></section>',
};

const mountPage = async () => {
  const wrapper = mount(BillingIndex, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: true,
        BillingCard: Card,
        BillingHeader: { template: '<div><slot /></div>' },
        BillingMeter: Meter,
        DetailItem: Detail,
        ButtonV4,
        Banner: {
          props: ['actionLabel'],
          emits: ['action'],
          template:
            '<div class="banner" @click="$emit(`action`)"><slot /></div>',
        },
        PurchaseCreditsModal: {
          name: 'PurchaseCreditsModal',
          emits: ['success'],
          methods: { open: () => env.purchaseOpen() },
          template: '<div />',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const button = (wrapper, text) =>
  wrapper.findAll('.btn').find(b => b.text() === text);
const details = wrapper =>
  Object.fromEntries(
    wrapper
      .findAllComponents(Detail)
      .map(d => [d.props('label').split('.').pop(), d.props('value')])
  );
const layout = wrapper => wrapper.findComponent(Layout);

describe('Billing settings behaviour', () => {
  beforeEach(() => {
    env.router = { push: vi.fn() };
    env.uiFlags = ref({});
    env.cloud = ref(true);
    env.pastDue = ref(false);
    env.account = ref({
      custom_attributes: { plan_name: 'Business', subscribed_quantity: 3 },
    });
    env.purchaseOpen = vi.fn();
    env.captain = {
      captainEnabled: true,
      captainLimits: { a: 1 },
      documentLimits: { consumed: 1 },
      responseLimits: { consumed: 2 },
      fetchLimits: vi.fn(),
      isFetchingLimits: false,
    };
    env.store = { dispatch: vi.fn().mockResolvedValue({}) };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.$chatwoot;
  });

  it('sends self-hosted users home', async () => {
    env.cloud.value = false;
    await mountPage();
    expect(env.router.push).toHaveBeenCalledWith({ name: 'home' });
    expect(env.captain.fetchLimits).not.toHaveBeenCalled();
  });

  it('shows the plan, seats, renewal, currency and Captain meters', async () => {
    env.account.value.custom_attributes = {
      plan_name: 'Business',
      subscribed_quantity: 3,
      subscription_ends_on: '2034-01-12T12:00:00Z',
      billing_currency: 'brl',
    };
    const wrapper = await mountPage();
    expect(env.store.dispatch).not.toHaveBeenCalledWith(
      'accounts/subscription'
    );
    expect(env.captain.fetchLimits).toHaveBeenCalled();
    expect(sessionStorage.remove).toHaveBeenCalledWith(
      'billing_refresh_attempted'
    );
    expect(details(wrapper)).toEqual({
      TITLE: 'Business',
      SEAT_COUNT: 3,
      RENEWS_ON: '12 Jan, 2034',
      CURRENCY: 'BILLING_SETTINGS.CURRENCY.OPTIONS.BRL',
    });
    expect(wrapper.findAllComponents(Meter)).toHaveLength(2);
    expect(layout(wrapper).props()).toMatchObject({
      isLoading: false,
      loadingMessage: 'ATTRIBUTES_MGMT.LOADING',
      noRecordsFound: false,
    });
    expect(wrapper.find('.banner').exists()).toBe(false);
  });

  it('shows cancellation and past due state', async () => {
    env.pastDue.value = true;
    env.account.value.custom_attributes = {
      plan_name: 'Startups',
      subscription_ends_on: '2034-01-12T12:00:00Z',
      subscription_cancels_on: '2034-02-01T12:00:00Z',
    };
    let wrapper = await mountPage();
    expect(details(wrapper)).toEqual({
      TITLE: 'Startups',
      CANCELS_ON: '01 Feb, 2034',
    });
    await wrapper.find('.banner').trigger('click');
    expect(env.store.dispatch).toHaveBeenCalledWith('accounts/checkout');

    env.account.value.custom_attributes = {
      plan_name: 'Startups',
      subscription_ends_on: '2034-01-12T12:00:00Z',
    };
    wrapper = await mountPage();
    expect(details(wrapper)).toEqual({ TITLE: 'Startups' });
  });

  it('runs the subscription, Captain and chat buttons', async () => {
    window.$chatwoot = { toggle: vi.fn() };
    const wrapper = await mountPage();
    await button(
      wrapper,
      'BILLING_SETTINGS.MANAGE_SUBSCRIPTION.BUTTON_TXT'
    ).trigger('click');
    expect(env.store.dispatch).toHaveBeenCalledWith('accounts/checkout');
    await button(wrapper, 'BILLING_SETTINGS.CAPTAIN.REFRESH_CREDITS').trigger(
      'click'
    );
    expect(env.captain.fetchLimits).toHaveBeenCalledTimes(2);
    await button(wrapper, 'BILLING_SETTINGS.TOPUP.BUY_CREDITS').trigger(
      'click'
    );
    expect(env.purchaseOpen).toHaveBeenCalled();
    wrapper.findComponent({ name: 'PurchaseCreditsModal' }).vm.$emit('success');
    expect(env.captain.fetchLimits).toHaveBeenCalledTimes(3);
    await button(wrapper, 'BILLING_SETTINGS.CHAT_WITH_US.BUTTON_TXT').trigger(
      'click'
    );
    expect(window.$chatwoot.toggle).toHaveBeenCalled();
    delete window.$chatwoot;
    await button(wrapper, 'BILLING_SETTINGS.CHAT_WITH_US.BUTTON_TXT').trigger(
      'click'
    );
  });

  it('hides credit purchases on the free plan and offers an upgrade without Captain', async () => {
    env.account.value.custom_attributes = { plan_name: 'Hacker' };
    env.captain.captainLimits = null;
    let wrapper = await mountPage();
    expect(
      button(wrapper, 'BILLING_SETTINGS.TOPUP.BUY_CREDITS')
    ).toBeUndefined();
    expect(wrapper.findAllComponents(Meter)).toHaveLength(0);

    env.captain.captainEnabled = false;
    wrapper = await mountPage();
    await button(wrapper, 'CAPTAIN.PAYWALL.UPGRADE_NOW').trigger('click');
    expect(env.store.dispatch).toHaveBeenCalledWith('accounts/checkout');
  });

  it('waits once for a new subscription, then shows the empty state', async () => {
    vi.useFakeTimers();
    env.account.value = {};
    env.store.dispatch.mockResolvedValue(undefined);
    let wrapper = await mountPage();
    expect(env.store.dispatch).toHaveBeenCalledWith('accounts/subscription');
    expect(sessionStorage.set).toHaveBeenCalledWith(
      'billing_refresh_attempted',
      true
    );
    expect(layout(wrapper).props()).toMatchObject({
      isLoading: true,
      loadingMessage: 'BILLING_SETTINGS.NO_BILLING_USER',
      noRecordsFound: false,
    });
    expect(wrapper.findAllComponents(Detail)).toHaveLength(0);
    // jsdom cannot navigate; the reload only logs.
    vi.advanceTimersByTime(5000);

    sessionStorage.get.mockReturnValueOnce(true);
    wrapper = await mountPage();
    expect(sessionStorage.remove).toHaveBeenCalledWith(
      'billing_refresh_attempted'
    );
    expect(layout(wrapper).props('noRecordsFound')).toBe(true);
  });

  it('asks new accounts to choose a billing currency', async () => {
    env.account.value = { custom_attributes: {} };
    env.store.dispatch.mockImplementation(async action =>
      action === 'accounts/subscription'
        ? {
            currency_selection_required: true,
            currency_options: ['usd', 'brl'],
          }
        : undefined
    );
    const wrapper = await mountPage();
    expect(sessionStorage.set).not.toHaveBeenCalled();
    expect(layout(wrapper).props('noRecordsFound')).toBe(false);
    const currency = button(wrapper, 'BILLING_SETTINGS.CURRENCY.OPTIONS.BRL');
    expect(
      button(wrapper, 'BILLING_SETTINGS.CURRENCY.OPTIONS.USD').exists()
    ).toBe(true);

    env.store.dispatch.mockImplementation(async action =>
      action === 'accounts/subscription'
        ? { currency_options: undefined }
        : undefined
    );
    sessionStorage.get.mockReturnValueOnce(true);
    await currency.trigger('click');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'accounts/selectBillingCurrency',
      'brl'
    );
    expect(layout(wrapper).props('noRecordsFound')).toBe(true);
  });
});
