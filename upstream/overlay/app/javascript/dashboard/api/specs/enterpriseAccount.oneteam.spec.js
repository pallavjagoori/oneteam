import enterpriseAccountAPI from '../enterprise/account';
import { useAxiosMock } from './oneteamAxiosMock';

describe('EnterpriseAccountAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/enterprise/api/v1/accounts/1/';

  it('reconnects Shopify', () => {
    enterpriseAccountAPI.reconnectShopify('tok');
    expect(axios.post).toHaveBeenCalledWith(`${url}reconnect_shopify`, {
      pending_install_token: 'tok',
    });
  });

  it('fetches the billing summary without refreshing by default', () => {
    enterpriseAccountAPI.billingSummary();
    expect(axios.get).toHaveBeenCalledWith(`${url}billing_summary`, {
      params: { refresh: false },
    });
    enterpriseAccountAPI.billingSummary({ refresh: true });
    expect(axios.get).toHaveBeenLastCalledWith(`${url}billing_summary`, {
      params: { refresh: true },
    });
  });

  it('selects the billing currency', () => {
    enterpriseAccountAPI.selectBillingCurrency('EUR');
    expect(axios.post).toHaveBeenCalledWith(`${url}select_billing_currency`, {
      currency: 'EUR',
    });
  });

  it('starts a top-up checkout and lists top-up options', () => {
    enterpriseAccountAPI.createTopupCheckout(500);
    expect(axios.post).toHaveBeenCalledWith(`${url}topup_checkout`, {
      credits: 500,
    });
    enterpriseAccountAPI.getTopupOptions();
    expect(axios.get).toHaveBeenCalledWith(`${url}topup_options`);
  });
});
