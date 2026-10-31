/**
 * OneTeam behaviour spec for the dashboard apps settings page.
 *
 * Covers loading apps, the count and empty state, searching (with the
 * no-results message), opening the create and edit dialog and closing
 * it, and deleting an app with success and error alerts.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import DashboardAppsIndex from '../Index.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading', 'noRecordsFound'],
  template: '<div><slot name="header" /><slot name="body" /><slot /></div>',
};
const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery'],
  emits: ['update:searchQuery'],
  template: '<header><slot name="count" /><slot name="actions" /></header>',
};
const Table = {
  name: 'BaseTable',
  props: ['headers', 'items'],
  template: '<table><slot name="row" :items="items" /></table>',
};
const Row = {
  name: 'DashboardAppsRow',
  props: ['app', 'index'],
  emits: ['edit', 'delete'],
  template: '<tr />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const AppModal = {
  name: 'DashboardAppModal',
  props: ['show', 'mode', 'selectedAppData'],
  emits: ['close'],
  template: '<div class="app-modal" />',
};
const DeleteModal = {
  name: 'WootDeleteModal',
  props: ['show', 'onClose', 'onConfirm', 'message'],
  emits: ['update:show'],
  template: '<div />',
};

const apps = [
  { id: 1, title: 'Orders', content: [{ url: 'https://orders.test' }] },
  { id: 2, title: 'Billing', content: [{ url: 'https://billing.test' }] },
];

const mountPage = async (records = apps) => {
  const $store = {
    dispatch: vi.fn().mockResolvedValue(),
    getters: {
      'dashboardApps/getRecords': records,
      'dashboardApps/getUIFlags': { isFetching: false },
    },
  };
  const wrapper = mount(DashboardAppsIndex, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: Header,
        BaseTable: Table,
        DashboardAppsRow: Row,
        NextButton,
        DashboardAppModal: AppModal,
        WootDeleteModal: DeleteModal,
      },
      mocks: {
        $store,
        $t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
      },
    },
  });
  await flushPromises();
  return { wrapper, $store };
};

describe('Dashboard apps index behaviour', () => {
  it('loads and lists apps with a count', async () => {
    const { wrapper, $store } = await mountPage();
    expect($store.dispatch).toHaveBeenCalledWith('dashboardApps/get');
    expect(wrapper.findAllComponents(Row).map(r => r.props('index'))).toEqual([
      0, 1,
    ]);
    expect(wrapper.text()).toContain(
      'INTEGRATION_SETTINGS.DASHBOARD_APPS.COUNT'
    );
    expect(wrapper.findComponent(Table).props('headers')).toHaveLength(3);
  });

  it('shows the empty state', async () => {
    const { wrapper } = await mountPage([]);
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(true);
    expect(wrapper.text()).not.toContain('COUNT');
  });

  it('searches apps by title', async () => {
    const { wrapper } = await mountPage();
    await wrapper
      .findComponent(Header)
      .vm.$emit('update:searchQuery', 'Billing');
    expect(wrapper.findAllComponents(Row).map(r => r.props('app').id)).toEqual([
      2,
    ]);
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', 'zzz');
    expect(wrapper.text()).toContain(
      'INTEGRATION_SETTINGS.DASHBOARD_APPS.NO_RESULTS'
    );
    expect(wrapper.findComponent(Table).exists()).toBe(false);
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', '  ');
    expect(wrapper.findAllComponents(Row)).toHaveLength(2);
  });

  it('opens the create and edit dialog and closes it', async () => {
    const { wrapper } = await mountPage();
    await wrapper.find('header button').trigger('click');
    expect(wrapper.findComponent(AppModal).props()).toEqual({
      show: true,
      mode: 'CREATE',
      selectedAppData: {},
    });
    await wrapper.findComponent(AppModal).vm.$emit('close');
    expect(wrapper.find('.app-modal').exists()).toBe(false);

    await wrapper.findAllComponents(Row)[1].vm.$emit('edit', apps[1]);
    expect(wrapper.findComponent(AppModal).props()).toEqual({
      show: true,
      mode: 'UPDATE',
      selectedAppData: apps[1],
    });
    await wrapper.findComponent(AppModal).vm.$emit('close');
    expect(wrapper.find('.app-modal').exists()).toBe(false);
  });

  it('deletes an app and reports the result', async () => {
    const { wrapper, $store } = await mountPage();
    const modal = () => wrapper.findComponent(DeleteModal);
    await wrapper.findAllComponents(Row)[0].vm.$emit('delete', apps[0]);
    expect(modal().props('show')).toBe(true);
    expect(modal().props('message')).toContain('Orders');
    modal().props('onClose')();
    await flushPromises();
    expect(modal().props('show')).toBe(false);
    await wrapper.findAllComponents(Row)[0].vm.$emit('delete', apps[0]);
    await modal().vm.$emit('update:show', false);
    expect(modal().props('show')).toBe(false);

    modal().props('onConfirm')();
    await flushPromises();
    expect($store.dispatch).toHaveBeenCalledWith('dashboardApps/delete', 1);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INTEGRATION_SETTINGS.DASHBOARD_APPS.DELETE.API_SUCCESS'
    );
    $store.dispatch.mockRejectedValueOnce(new Error('x'));
    modal().props('onConfirm')();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'INTEGRATION_SETTINGS.DASHBOARD_APPS.DELETE.API_ERROR'
    );
  });
});
