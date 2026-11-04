/**
 * OneTeam behaviour spec for the Shopify ShopifyOrderItem row.
 *
 * Covers paid and other financial statuses, fulfillment colours, the
 * default currency, and hiding missing statuses.
 */
import { mount } from '@vue/test-utils';
import ShopifyOrderItem from '../ShopifyOrderItem.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

/**
 * Mounts the row.
 *
 * @param {object} order order data
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountItem = order =>
  mount(ShopifyOrderItem, {
    props: {
      order: {
        id: 1001,
        admin_url: 'https://shop/admin/1001',
        created_at: '2026-01-05T10:00:00Z',
        total_price: '12.50',
        ...order,
      },
    },
    global: { mocks: { $t: (key, params) => `${key}:${params?.id ?? ''}` } },
  });

describe('ShopifyOrderItem behaviour', () => {
  it('hides missing statuses and defaults to USD', () => {
    const wrapper = mountItem({});
    expect(wrapper.text()).toContain('$12.50');
    expect(wrapper.find('.capitalize.font-medium').exists()).toBe(false);
    expect(wrapper.find('.rounded').classes()).toContain('bg-n-solid-3');
  });

  it('styles a paid, fulfilled order', () => {
    const wrapper = mountItem({
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      currency: 'EUR',
    });
    expect(wrapper.find('.rounded').classes()).toContain('bg-n-teal-5');
    expect(wrapper.text()).toContain(
      'CONVERSATION_SIDEBAR.SHOPIFY.FINANCIAL_STATUS.PAID'
    );
    expect(wrapper.find('.text-n-teal-9').text()).toBe(
      'CONVERSATION_SIDEBAR.SHOPIFY.FULFILLMENT_STATUS.FULFILLED'
    );
    expect(wrapper.text()).toContain('€12.50');
  });

  it.each([
    ['partial', 'text-n-amber-9'],
    ['unfulfilled', 'text-n-ruby-9'],
    ['restocked', 'text-n-slate-11'],
  ])('colours a %s fulfillment', (status, colour) => {
    const wrapper = mountItem({
      financial_status: 'pending',
      fulfillment_status: status,
    });
    expect(wrapper.find(`.${colour}`).exists()).toBe(true);
  });
});
