/**
 * OneTeam behaviour spec for the buy-credits dialog.
 *
 * Covers loading packages (popular default, first-package fallback,
 * empty list, currency handling), the loading and retry states,
 * picking a package, the confirm step with formatted amounts, buying
 * credits (success and both error shapes), going back, and closing.
 */
import { flushPromises, mount } from '@vue/test-utils';
import EnterpriseAccountAPI from 'dashboard/api/enterprise/account';
import { useAlert } from 'dashboard/composables';
import PurchaseCreditsModal from '../PurchaseCreditsModal.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/api/enterprise/account', () => ({
  default: { getTopupOptions: vi.fn(), createTopupCheckout: vi.fn() },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const Dialog = {
  name: 'Dialog',
  props: ['title', 'description', 'width'],
  methods: { open: () => env.dialog.open(), close: () => env.dialog.close() },
  template: '<div><slot /><footer><slot name="footer" /></footer></div>',
};
const NextButton = {
  name: 'Button',
  props: ['label', 'disabled', 'isLoading'],
  template: '<button :disabled="disabled">{{ label }}</button>',
};
const Package = {
  name: 'CreditPackageCard',
  props: ['credits', 'amount', 'currency', 'isPopular', 'isSelected'],
  emits: ['select'],
  template: '<div class="pkg" />',
};

const options = [
  { credits: 1000, amount: 10 },
  { credits: 6000, amount: 50, currency: 'brl' },
];

const mountModal = async (data = { options, currency: 'USD' }) => {
  if (data instanceof Error)
    EnterpriseAccountAPI.getTopupOptions.mockRejectedValue(data);
  else EnterpriseAccountAPI.getTopupOptions.mockResolvedValue({ data });
  const wrapper = mount(PurchaseCreditsModal, {
    global: {
      stubs: {
        Dialog,
        Button: NextButton,
        CreditPackageCard: Package,
        Spinner: true,
      },
      mocks: {
        $t: (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key),
      },
    },
  });
  wrapper.vm.open();
  await flushPromises();
  return wrapper;
};

const button = (wrapper, label) =>
  wrapper.findAllComponents(NextButton).find(b => b.props('label') === label);
const PURCHASE = 'BILLING_SETTINGS.TOPUP.PURCHASE';
const CONFIRM = 'BILLING_SETTINGS.TOPUP.CONFIRM.CONFIRM_PURCHASE';

describe('PurchaseCreditsModal behaviour', () => {
  beforeEach(() => {
    env.dialog = { open: vi.fn(), close: vi.fn() };
  });

  it('loads packages and preselects the popular one', async () => {
    const wrapper = await mountModal();
    expect(env.dialog.open).toHaveBeenCalled();
    const cards = wrapper.findAllComponents(Package);
    expect(cards.map(c => c.props('isPopular'))).toEqual([false, true]);
    expect(cards.map(c => c.props('isSelected'))).toEqual([false, true]);
    expect(wrapper.findComponent(Dialog).props()).toMatchObject({
      title: 'BILLING_SETTINGS.TOPUP.MODAL_TITLE',
      description: 'BILLING_SETTINGS.TOPUP.MODAL_DESCRIPTION',
      width: 'xl',
    });
    await cards[0].vm.$emit('select');
    expect(wrapper.findAllComponents(Package)[0].props('isSelected')).toBe(
      true
    );
  });

  it('falls back to the first package, or none', async () => {
    let wrapper = await mountModal({ options: [{ credits: 500, amount: 5 }] });
    expect(wrapper.findComponent(Package).props('isSelected')).toBe(true);
    wrapper = await mountModal({});
    expect(wrapper.findAllComponents(Package)).toHaveLength(0);
    expect(button(wrapper, PURCHASE).props('disabled')).toBe(true);
    await button(wrapper, PURCHASE).vm.$emit('click');
    expect(wrapper.text()).not.toContain('CONFIRM.DESCRIPTION');
  });

  it('shows loading and a retry after a failed load', async () => {
    const wrapper = await mountModal(new Error('down'));
    expect(wrapper.text()).toContain('BILLING_SETTINGS.TOPUP.FETCH_ERROR');
    expect(button(wrapper, PURCHASE).props('disabled')).toBe(true);
    let finish;
    EnterpriseAccountAPI.getTopupOptions.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await button(wrapper, 'BILLING_SETTINGS.TOPUP.RETRY').trigger('click');
    expect(wrapper.text()).toContain('BILLING_SETTINGS.TOPUP.LOADING');
    finish({ data: { options } });
    await flushPromises();
    expect(wrapper.findAllComponents(Package)).toHaveLength(2);
  });

  it('confirms and buys credits', async () => {
    const wrapper = await mountModal();
    await button(wrapper, PURCHASE).trigger('click');
    expect(wrapper.findComponent(Dialog).props()).toMatchObject({
      title: 'BILLING_SETTINGS.TOPUP.CONFIRM.TITLE',
      description: '',
      width: 'md',
    });
    expect(wrapper.text()).toContain('"credits":"6,000"');
    expect(wrapper.text()).toContain('R$');

    await button(wrapper, 'BILLING_SETTINGS.TOPUP.CONFIRM.GO_BACK').trigger(
      'click'
    );
    await wrapper.findAllComponents(Package)[0].vm.$emit('select');
    await button(wrapper, PURCHASE).trigger('click');
    expect(wrapper.text()).toContain('$10.00');

    EnterpriseAccountAPI.createTopupCheckout.mockResolvedValue({
      data: { credits: 1000 },
    });
    await button(wrapper, CONFIRM).trigger('click');
    await flushPromises();
    expect(EnterpriseAccountAPI.createTopupCheckout).toHaveBeenCalledWith(1000);
    expect(env.dialog.close).toHaveBeenCalled();
    expect(wrapper.emitted('success')).toEqual([[{ credits: 1000 }]]);
    expect(useAlert).toHaveBeenCalledWith(
      expect.stringContaining('BILLING_SETTINGS.TOPUP.PURCHASE_SUCCESS')
    );
  });

  it('reports purchase errors', async () => {
    const wrapper = await mountModal({ options, currency: undefined });
    await button(wrapper, PURCHASE).trigger('click');
    EnterpriseAccountAPI.createTopupCheckout.mockRejectedValue({
      response: { data: { error: 'Card declined' } },
    });
    await button(wrapper, CONFIRM).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Card declined');
    expect(button(wrapper, CONFIRM).props('isLoading')).toBe(false);
    EnterpriseAccountAPI.createTopupCheckout.mockRejectedValue(
      new Error('down')
    );
    await button(wrapper, CONFIRM).trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'BILLING_SETTINGS.TOPUP.PURCHASE_ERROR'
    );
  });

  it('closes from the cancel button', async () => {
    const wrapper = await mountModal();
    await button(wrapper, 'BILLING_SETTINGS.TOPUP.CANCEL').trigger('click');
    expect(env.dialog.close).toHaveBeenCalled();
  });
});
