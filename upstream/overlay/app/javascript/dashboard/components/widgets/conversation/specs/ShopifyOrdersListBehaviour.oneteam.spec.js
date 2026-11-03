/**
 * OneTeam behaviour spec for the conversation ShopifyOrdersList.
 *
 * Covers contacts without email or phone, loading, orders, empty
 * results, API errors with and without a message, and refetching when
 * the contact changes.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import ShopifyAPI from 'dashboard/api/integrations/shopify';
import ShopifyOrdersList from '../ShopifyOrdersList.vue';

const contact = ref(null);

vi.mock('dashboard/composables/store', () => ({
  useFunctionGetter: () => contact,
}));

vi.mock('dashboard/api/integrations/shopify', () => ({
  default: { getOrders: vi.fn() },
}));

/**
 * Mounts the orders list.
 *
 * @param {number} contactId contact id
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountList = (contactId = 1) =>
  mount(ShopifyOrdersList, {
    props: { contactId },
    global: {
      mocks: { $t: key => key },
      stubs: {
        Spinner: { template: '<i class="spinner" />' },
        ShopifyOrderItem: {
          props: ['order'],
          template: '<div class="order" />',
        },
      },
    },
  });

describe('ShopifyOrdersList behaviour', () => {
  it('shows no orders without searchable info', () => {
    contact.value = { name: 'Anon' };
    const wrapper = mountList();
    expect(ShopifyAPI.getOrders).not.toHaveBeenCalled();
    expect(wrapper.text()).toBe(
      'CONVERSATION_SIDEBAR.SHOPIFY.NO_SHOPIFY_ORDERS'
    );
  });

  it('loads and lists orders, refetching on contact change', async () => {
    contact.value = { email: 'a@b.co' };
    ShopifyAPI.getOrders.mockResolvedValue({
      data: { orders: [{ id: 1 }, { id: 2 }] },
    });
    const wrapper = mountList();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    await flushPromises();
    expect(wrapper.findAll('.order')).toHaveLength(2);
    await wrapper.setProps({ contactId: 2 });
    await flushPromises();
    expect(ShopifyAPI.getOrders).toHaveBeenLastCalledWith(2);
  });

  it('shows the empty state for no orders', async () => {
    contact.value = { phone_number: '+1' };
    ShopifyAPI.getOrders.mockResolvedValue({ data: { orders: [] } });
    const wrapper = mountList();
    await flushPromises();
    expect(wrapper.text()).toBe(
      'CONVERSATION_SIDEBAR.SHOPIFY.NO_SHOPIFY_ORDERS'
    );
  });

  it('shows the API error message or a default', async () => {
    contact.value = { email: 'a@b.co' };
    ShopifyAPI.getOrders.mockRejectedValueOnce({
      response: { data: { error: 'Shop down' } },
    });
    const wrapper = mountList();
    await flushPromises();
    expect(wrapper.text()).toBe('Shop down');
    ShopifyAPI.getOrders.mockRejectedValueOnce(new Error('x'));
    const fallback = mountList();
    await flushPromises();
    expect(fallback.text()).toBe('CONVERSATION_SIDEBAR.SHOPIFY.ERROR');
  });
});
