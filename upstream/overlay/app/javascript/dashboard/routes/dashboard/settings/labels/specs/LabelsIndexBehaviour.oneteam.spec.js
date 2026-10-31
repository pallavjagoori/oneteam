/**
 * OneTeam behaviour spec for the labels settings page.
 *
 * Covers loading labels, the count, searching by title and
 * description, opening and closing the add, edit and delete dialogs,
 * and deleting a label (success, error message and fallback message).
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import LabelsIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useStoreGetters: () =>
    new Proxy({}, { get: (_, name) => computed(() => env.getters[name]) }),
}));

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
  props: ['headers', 'items', 'noDataMessage'],
  template: '<table><slot name="row" :items="items" /></table>',
};
const Row = { name: 'BaseTableRow', template: '<tr><slot /></tr>' };
const Cell = { name: 'BaseTableCell', template: '<td><slot /></td>' };
const NextButton = {
  name: 'Button',
  props: ['label', 'icon', 'isLoading'],
  template: '<button :data-icon="icon">{{ label }}</button>',
};
const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  template: '<div v-if="show" class="modal"><slot /></div>',
};
const DeleteModal = {
  name: 'WootDeleteModal',
  props: ['show', 'onClose', 'onConfirm', 'messageValue'],
  template: '<div />',
};
const AddLabel = {
  name: 'AddLabel',
  emits: ['close'],
  template: '<div class="add" />',
};
const EditLabel = {
  name: 'EditLabel',
  props: ['selectedResponse'],
  emits: ['close'],
  template: '<div class="edit" />',
};

const labels = [
  { id: 1, title: 'billing', description: 'Money matters', color: '#f00' },
  { id: 2, title: 'support', description: 'Help requests', color: '#0f0' },
];

const mountPage = (records = labels) => {
  env.store = { dispatch: vi.fn().mockResolvedValue() };
  env.getters = reactive({
    'labels/getLabels': records,
    'labels/getUIFlags': { isFetching: false },
  });
  return mount(LabelsIndex, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: Header,
        BaseTable: Table,
        BaseTableRow: Row,
        BaseTableCell: Cell,
        Button: NextButton,
        WootModal: Modal,
        WootDeleteModal: DeleteModal,
        AddLabel,
        EditLabel,
      },
      mocks: { $t: key => key },
    },
  });
};

const rowButtons = (wrapper, index) =>
  wrapper.findAll('tr')[index].findAll('button');

describe('Labels index behaviour', () => {
  it('loads labels and shows rows with a count', () => {
    const wrapper = mountPage();
    expect(env.store.dispatch).toHaveBeenCalledWith('labels/get');
    expect(wrapper.findAll('tr')).toHaveLength(2);
    expect(wrapper.text()).toContain('LABEL_MGMT.COUNT');
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(false);
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe(
      'LABEL_MGMT.LIST.404'
    );
  });

  it('shows the empty state without a count', () => {
    const wrapper = mountPage([]);
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(true);
    expect(wrapper.text()).not.toContain('LABEL_MGMT.COUNT');
  });

  it('searches labels', async () => {
    const wrapper = mountPage();
    await wrapper
      .findComponent(Header)
      .vm.$emit('update:searchQuery', 'support');
    expect(
      wrapper
        .findComponent(Table)
        .props('items')
        .map(l => l.id)
    ).toEqual([2]);
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe(
      'LABEL_MGMT.NO_RESULTS'
    );
    await wrapper.findComponent(Header).vm.$emit('update:searchQuery', '   ');
    expect(wrapper.findComponent(Table).props('items')).toHaveLength(2);
  });

  it('opens and closes the add and edit dialogs', async () => {
    const wrapper = mountPage();
    await wrapper.find('header button').trigger('click');
    expect(wrapper.find('.add').exists()).toBe(true);
    await wrapper.findComponent(AddLabel).vm.$emit('close');
    expect(wrapper.find('.add').exists()).toBe(false);

    await rowButtons(wrapper, 1)[0].trigger('click');
    expect(wrapper.findComponent(EditLabel).props('selectedResponse')).toEqual(
      labels[1]
    );
    await wrapper.findComponent(EditLabel).vm.$emit('close');
    expect(wrapper.find('.edit').exists()).toBe(false);
  });

  it('deletes a label and reports the result', async () => {
    const wrapper = mountPage();
    await rowButtons(wrapper, 0)[1].trigger('click');
    const modal = () => wrapper.findComponent(DeleteModal);
    expect(modal().props()).toMatchObject({
      show: true,
      messageValue: ' billing?',
    });
    modal().props('onClose')();
    await flushPromises();
    expect(modal().props('show')).toBe(false);

    await rowButtons(wrapper, 0)[1].trigger('click');
    modal().props('onConfirm')();
    expect(rowButtons(wrapper, 0)[0].exists()).toBe(true);
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('labels/delete', 1);
    expect(useAlert).toHaveBeenLastCalledWith(
      'LABEL_MGMT.DELETE.API.SUCCESS_MESSAGE'
    );
    expect(wrapper.findAllComponents(NextButton)[1].props('isLoading')).toBe(
      false
    );

    env.store.dispatch.mockRejectedValueOnce(new Error('In use'));
    modal().props('onConfirm')();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('In use');
    env.store.dispatch.mockRejectedValueOnce({});
    modal().props('onConfirm')();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'LABEL_MGMT.DELETE.API.ERROR_MESSAGE'
    );
  });
});
