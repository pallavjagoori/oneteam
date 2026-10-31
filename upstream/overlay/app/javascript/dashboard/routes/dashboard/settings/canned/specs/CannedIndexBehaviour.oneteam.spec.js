/**
 * OneTeam behaviour spec for the canned responses settings page.
 *
 * Covers fetching on mount, sorting, searching, the add / edit modals and
 * the delete confirmation flow (success and failure alerts).
 */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import CannedIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({ getPlainText: text => `plain:${text}` }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStore: () => env.store,
    useStoreGetters: () => ({
      getSortedCannedResponses: computed(() => order => {
        env.sortCalls.push(order);
        const list = [...env.state.records];
        return order === 'asc' ? list : list.reverse();
      }),
      getUIFlags: computed(() => env.state.uiFlags),
    }),
  };
});

const { useAlert } = await import('dashboard/composables');

const ButtonStub = {
  name: 'Button',
  props: ['label', 'icon', 'isLoading'],
  emits: ['click'],
  template:
    '<button :data-label="label" :data-icon="icon" :data-loading="String(!!isLoading)" @click="$emit(\'click\')">{{ label }}</button>',
};
const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading', 'loadingMessage', 'noRecordsFound', 'noRecordsMessage'],
  template: '<div><slot name="header" /><slot name="body" /><slot /></div>',
};
const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery', 'title'],
  emits: ['update:searchQuery'],
  template: '<header><slot name="count" /><slot name="actions" /></header>',
};
const Table = {
  name: 'BaseTable',
  props: ['headers', 'items', 'noDataMessage'],
  template:
    '<table><thead><slot name="header-0" /><slot name="header-1" /></thead><tbody><slot name="row" :items="items" /></tbody></table>',
};
const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  // Always renders its slot so the edit form's own v-if is exercised.
  template: '<div class="modal" :data-show="String(show)"><slot /></div>',
};
const DeleteModal = {
  name: 'WootDeleteModal',
  props: [
    'show',
    'onClose',
    'onConfirm',
    'title',
    'message',
    'messageValue',
    'confirmText',
    'rejectText',
  ],
  template: '<div class="delete-modal" :data-show="String(show)" />',
};

const records = [
  { id: 1, short_code: 'hello', content: 'Hello there' },
  { id: 2, short_code: 'bye', content: 'Goodbye **friend**' },
];

const mountPage = () =>
  mount(CannedIndex, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: Header,
        BaseTable: Table,
        BaseTableRow: { template: '<tr class="row"><slot /></tr>' },
        BaseTableCell: { template: '<td><slot /></td>' },
        Button: ButtonStub,
        Icon: {
          name: 'Icon',
          props: ['icon'],
          template: '<i class="sort-icon" :data-icon="icon" />',
        },
        WootModal: Modal,
        WootDeleteModal: DeleteModal,
        AddCanned: {
          name: 'AddCanned',
          props: ['onClose'],
          template: '<div class="add" />',
        },
        EditCanned: {
          name: 'EditCanned',
          props: ['id', 'edshortCode', 'edcontent', 'onClose'],
          template: '<div class="edit" />',
        },
      },
    },
  });

const shortCodes = wrapper =>
  wrapper.findAll('.row .text-heading-3').map(n => n.text());

describe('Canned responses settings page', () => {
  beforeEach(() => {
    env.state = reactive({
      records: records.map(r => ({ ...r })),
      uiFlags: { fetchingList: false },
    });
    env.sortCalls = [];
    env.store = { dispatch: vi.fn(async () => {}) };
  });

  it('fetches on mount and lists the responses', async () => {
    const wrapper = mountPage();
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('getCannedResponse');
    expect(shortCodes(wrapper)).toEqual(['hello', 'bye']);
    expect(wrapper.text()).toContain('plain:Goodbye **friend**');
    expect(wrapper.text()).toContain('CANNED_MGMT.LIST.TABLE_HEADER.ACTIONS');
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(false);
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe('');
    expect(wrapper.find('header span').exists()).toBe(true);
  });

  it('ignores fetch errors and passes the loading flag', async () => {
    env.store.dispatch.mockRejectedValueOnce(new Error('offline'));
    env.state.uiFlags.fetchingList = true;
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(true);
  });

  it('shows the empty state without records', async () => {
    env.state.records = [];
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(true);
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe(
      'CANNED_MGMT.LIST.404'
    );
    expect(wrapper.find('header span').exists()).toBe(false);
  });

  it('toggles the sort order from the header', async () => {
    const wrapper = mountPage();
    const sortButton = wrapper.find('thead button');
    expect(wrapper.find('.sort-icon').attributes('data-icon')).toBe(
      'i-woot-sort-ascending'
    );
    await sortButton.trigger('click');
    expect(env.sortCalls.at(-1)).toBe('desc');
    expect(shortCodes(wrapper)).toEqual(['bye', 'hello']);
    expect(wrapper.find('.sort-icon').attributes('data-icon')).toBe(
      'i-woot-sort-descending'
    );
    await sortButton.trigger('click');
    expect(env.sortCalls.at(-1)).toBe('asc');
  });

  it('filters by search query and reports no results', async () => {
    const wrapper = mountPage();
    const header = wrapper.findComponent(Header);
    header.vm.$emit('update:searchQuery', 'bye');
    await flushPromises();
    expect(shortCodes(wrapper)).toEqual(['bye']);

    header.vm.$emit('update:searchQuery', 'zzzz');
    await flushPromises();
    expect(shortCodes(wrapper)).toEqual([]);
    expect(wrapper.findComponent(Table).props('noDataMessage')).toBe(
      'CANNED_MGMT.NO_RESULTS'
    );

    header.vm.$emit('update:searchQuery', '   ');
    await flushPromises();
    expect(shortCodes(wrapper)).toEqual(['hello', 'bye']);
  });

  it('opens and closes the add modal', async () => {
    const wrapper = mountPage();
    const addModal = () => wrapper.findAllComponents(Modal)[0];
    expect(addModal().props('show')).toBe(false);
    expect(wrapper.find('.edit').exists()).toBe(false);
    await wrapper.find('header button').trigger('click');
    expect(addModal().props('show')).toBe(true);
    wrapper.findComponent({ name: 'AddCanned' }).props('onClose')();
    await flushPromises();
    expect(addModal().props('show')).toBe(false);
  });

  it('opens the edit modal for a response', async () => {
    const wrapper = mountPage();
    await wrapper.findAll('[data-icon="i-woot-edit-pen"]')[1].trigger('click');
    const edit = wrapper.findComponent({ name: 'EditCanned' });
    expect(edit.props()).toMatchObject({
      id: 2,
      edshortCode: 'bye',
      edcontent: 'Goodbye **friend**',
    });
    edit.props('onClose')();
    await flushPromises();
    expect(wrapper.find('.edit').exists()).toBe(false);
  });

  it('confirms and deletes a response', async () => {
    const wrapper = mountPage();
    await wrapper.findAll('[data-icon="i-woot-bin"]')[0].trigger('click');
    const modal = wrapper.findComponent(DeleteModal);
    expect(modal.props()).toMatchObject({
      show: true,
      messageValue: ' hello ? ',
    });
    expect(modal.props('confirmText')).toMatch(/ hello$/);
    expect(modal.props('rejectText')).toMatch(/ hello$/);

    modal.props('onClose')();
    await flushPromises();
    expect(modal.props('show')).toBe(false);

    await wrapper.findAll('[data-icon="i-woot-bin"]')[0].trigger('click');
    modal.props('onConfirm')();
    await flushPromises();
    expect(modal.props('show')).toBe(false);
    expect(env.store.dispatch).toHaveBeenCalledWith('deleteCannedResponse', 1);
    expect(useAlert).toHaveBeenCalledWith(
      'CANNED_MGMT.DELETE.API.SUCCESS_MESSAGE'
    );
    // `loading` is set on the ref itself, not its value, so the delete
    // button never shows a spinner (see FINDINGS.md).
    expect(
      wrapper.findAll('[data-icon="i-woot-bin"]')[0].attributes('data-loading')
    ).toBe('false');
  });

  it('alerts with the API error or a fallback when delete fails', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const modal = wrapper.findComponent(DeleteModal);

    env.store.dispatch.mockRejectedValueOnce(new Error('in use'));
    await wrapper.findAll('[data-icon="i-woot-bin"]')[1].trigger('click');
    modal.props('onConfirm')();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('in use');

    env.store.dispatch.mockRejectedValueOnce(undefined);
    await wrapper.findAll('[data-icon="i-woot-bin"]')[1].trigger('click');
    modal.props('onConfirm')();
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'CANNED_MGMT.DELETE.API.ERROR_MESSAGE'
    );
  });
});
