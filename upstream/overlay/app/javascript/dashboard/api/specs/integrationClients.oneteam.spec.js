import shopifyAPI from '../integrations/shopify';
import stripeAPI from '../integrations/stripe';
import { useAxiosMock } from './oneteamAxiosMock';

const base = '/api/v1/accounts/1/integrations';

describe('ShopifyAPI (OneTeam)', () => {
  const axios = useAxiosMock();

  it('connects a shop, fetches orders and completes an install', () => {
    shopifyAPI.connect('shop.myshopify.com');
    expect(axios.post).toHaveBeenCalledWith(`${base}/shopify/auth`, {
      shop_domain: 'shop.myshopify.com',
    });
    shopifyAPI.getOrders(3);
    expect(axios.get).toHaveBeenCalledWith(`${base}/shopify/orders`, {
      params: { contact_id: 3 },
    });
    shopifyAPI.completeInstall('tok');
    expect(axios.post).toHaveBeenCalledWith(
      `${base}/shopify/complete_install`,
      { pending_install_token: 'tok' }
    );
  });
});

describe('StripeAPI (OneTeam)', () => {
  const axios = useAxiosMock();

  it('connects, disconnects and fetches a customer', () => {
    stripeAPI.connect();
    expect(axios.post).toHaveBeenCalledWith(`${base}/stripe/auth`);
    stripeAPI.disconnect();
    expect(axios.delete).toHaveBeenCalledWith(`${base}/stripe`);
    const signal = new AbortController().signal;
    stripeAPI.customer(5, 'cus_1', signal);
    expect(axios.get).toHaveBeenCalledWith(`${base}/stripe/customer`, {
      params: { conversation_id: 5, customer_id: 'cus_1' },
      signal,
    });
  });
});
