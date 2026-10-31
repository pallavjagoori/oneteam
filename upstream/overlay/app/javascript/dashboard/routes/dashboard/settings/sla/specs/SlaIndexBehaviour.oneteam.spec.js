/**
 * OneTeam behaviour spec for the SLA policies settings page.
 *
 * Vuex getters, router and modals are faked. Covers the enterprise
 * paywall and upgrade link, listing policies with business hours and
 * thresholds, search with its empty messages, adding a policy, and
 * deleting one with success or error alerts.
 */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import SlaIndex from '../Index.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

let store;
let router;

const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery', 'searchPlaceholder'],
  emits: ['update:searchQuery'],
  template: '<header><slot name="count" /><slot name="actions" /></header>',
};
const Table = {
  name: 'BaseTable',
  props: ['headers', 'items', 'noDataMessage'],
  template:
    '<table><slot name="header-2" /><slot name="header-3" /><slot name="header-4" /><slot name="row" :items="items" /></table>',
};
const Paywall = {
  name: 'SLAPaywallEnterprise',
  props: ['isSuperAdmin', 'isOnChatwootCloud'],
  emits: ['upgrade'],
  template: '<div class="paywall" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'isLoading'],
  emits: ['click'],
  template: '<button>{{ label }}</button>',
};
const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  template: '<div v-if="show" class="add-modal"><slot /></div>',
};
const DeleteModal = {
  name: 'WootDeleteModal',
  props: [
    'show',
    'onClose',
    'onConfirm',
    'messageValue',
    'confirmText',
    'rejectText',
  ],
  template: '<div />',
};
const AddSLA = { name: 'AddSLA', emits: ['close'], template: '<form />' };

const policies = [
  {
    id: 1,
    name: 'Gold',
    description: 'VIP customers',
    only_during_business_hours: true,
    first_response_time_threshold: 3600,
    next_response_time_threshold: 120,
    resolution_time_threshold: 172800,
  },
  {
    id: 2,
    name: 'Basic',
    description: 'Everyone else',
    first_response_time_threshold: 0,
  },
];

const mountPage = async () => {
  const wrapper = mount(SlaIndex, {
    global: {
      mocks: { $store: store, $router: router },
      stubs: {
        SettingsLayout: {
          template: '<div><slot name="header" /><slot name="body" /></div>',
        },
        BaseSettingsHeader: Header,
        BaseTable: Table,
        BaseTableRow: { template: '<tr><slot /></tr>' },
        BaseTableCell: { template: '<td><slot /></td>' },
        WootLabel: {
          props: ['label', 'color'],
          template:
            '<span class="label"><slot name="icon" />{{ label }}</span>',
        },
        Icon: true,
        NextButton,
        SLAPaywallEnterprise: Paywall,
        WootModal: Modal,
        WootDeleteModal: DeleteModal,
        AddSLA,
      },
      directives: { tooltip: {} },
    },
  });
  await flushPromises();
  return wrapper;
};

const rows = wrapper => wrapper.findAll('tr');
const table = wrapper => wrapper.findComponent(Table);

describe('SLA settings behaviour', () => {
  beforeEach(() => {
    store = {
      dispatch: vi.fn().mockResolvedValue(),
      getters: reactive({
        'globalConfig/isOnChatwootCloud': true,
        'accounts/isFeatureEnabledonAccount': () => true,
        'sla/getSLA': policies,
        getCurrentUser: { type: 'User' },
        getCurrentAccountId: 1,
        'sla/getUIFlags': { isFetching: false },
      }),
    };
    router = { push: vi.fn() };
  });

  it('shows the paywall and links to billing', async () => {
    store.getters['accounts/isFeatureEnabledonAccount'] = () => false;
    store.getters.getCurrentUser = { type: 'SuperAdmin' };
    const wrapper = await mountPage();
    expect(store.dispatch).toHaveBeenCalledWith('sla/get');
    expect(wrapper.findComponent(Header).props('searchPlaceholder')).toBe('');
    expect(wrapper.text()).not.toContain('SLA.COUNT');
    expect(wrapper.findComponent(Paywall).props()).toEqual({
      isSuperAdmin: true,
      isOnChatwootCloud: true,
    });
    await wrapper.findComponent(Paywall).vm.$emit('upgrade');
    expect(router.push).toHaveBeenCalledWith({
      name: 'billing_settings_index',
      params: { accountId: 1 },
    });
  });

  it('lists policies with business hours and thresholds', async () => {
    const wrapper = await mountPage();
    expect(wrapper.text()).toContain('SLA.COUNT');
    expect(table(wrapper).props('headers')).toHaveLength(6);
    expect(table(wrapper).props('noDataMessage')).toBe('');
    const [gold, basic] = rows(wrapper);
    expect(gold.text()).toContain('SLA.LIST.BUSINESS_HOURS_ON');
    expect(
      gold
        .findAll('td')
        .slice(2, 5)
        .map(td => td.text())
    ).toEqual(['1h', '2m', '2d']);
    expect(basic.text()).toContain('SLA.LIST.BUSINESS_HOURS_OFF');
    expect(basic.findAll('td')[2].text()).toBe('-');
  });

  it('searches policies', async () => {
    const wrapper = await mountPage();
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', 'gold');
    expect(rows(wrapper)).toHaveLength(1);
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', 'zzz');
    expect(table(wrapper).props('noDataMessage')).toBe('SLA.SEARCH.NO_RESULTS');
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', '  ');
    expect(rows(wrapper)).toHaveLength(2);
  });

  it('shows the empty list message', async () => {
    store.getters['sla/getSLA'] = [];
    const wrapper = await mountPage();
    expect(table(wrapper).props('noDataMessage')).toBe('SLA.LIST.404');
    expect(wrapper.text()).not.toContain('SLA.COUNT');
  });

  it('opens and closes the add dialog', async () => {
    const wrapper = await mountPage();
    await wrapper.findAllComponents(NextButton)[0].vm.$emit('click');
    expect(wrapper.find('.add-modal').exists()).toBe(true);
    await wrapper.findComponent(AddSLA).vm.$emit('close');
    expect(wrapper.find('.add-modal').exists()).toBe(false);
    await wrapper.findAllComponents(NextButton)[0].vm.$emit('click');
    wrapper.findComponent(Modal).props('onClose')();
    await flushPromises();
    expect(wrapper.find('.add-modal').exists()).toBe(false);
  });

  it('deletes policies and reports the result', async () => {
    const wrapper = await mountPage();
    const deleteButton = () => wrapper.findAllComponents(NextButton)[1];
    await deleteButton().vm.$emit('click');
    const modal = wrapper.findComponent(DeleteModal);
    expect(modal.props()).toMatchObject({
      show: true,
      messageValue: ' Gold',
      confirmText: 'SLA.DELETE.CONFIRM.YES',
      rejectText: 'SLA.DELETE.CONFIRM.NO',
    });
    modal.props('onClose')();
    await flushPromises();
    expect(modal.props('show')).toBe(false);

    await deleteButton().vm.$emit('click');
    let finish;
    store.dispatch.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    modal.props('onConfirm')();
    await flushPromises();
    expect(store.dispatch).toHaveBeenCalledWith('sla/delete', 1);
    expect(deleteButton().props('isLoading')).toBe(true);
    finish();
    await flushPromises();
    expect(deleteButton().props('isLoading')).toBe(false);
    expect(useAlert).toHaveBeenLastCalledWith('SLA.DELETE.API.SUCCESS_MESSAGE');

    store.dispatch.mockRejectedValueOnce(new Error('no'));
    await deleteButton().vm.$emit('click');
    modal.props('onConfirm')();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('SLA.DELETE.API.ERROR_MESSAGE');
  });
});
