/**
 * OneTeam behaviour spec for the macros settings list.
 *
 * Covers fetching macros on mount, the loading and empty states, the
 * count, searching by name (and its empty-result message), admin rights
 * passed to each row, and deleting a macro through the confirmation
 * modal with success and failure alerts.
 */
import { computed, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import MacrosIndex from '../Index.vue';

const env = vi.hoisted(() => ({ macros: null, flags: null, dispatch: null, alert: null, admin: true }));

vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({
    'macros/getMacros': computed(() => env.macros.value),
    'macros/getUIFlags': computed(() => env.flags.value),
  }),
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: computed(() => env.admin) }),
}));
vi.mock('dashboard/components-next/table', async importOriginal => ({
  ...(await importOriginal()),
  BaseTable: {
    name: 'BaseTable',
    props: ['items', 'noDataMessage'],
    template: '<div class="table" :data-empty="noDataMessage"><slot name="row" :items="items" /></div>',
  },
}));

const SettingsLayout = {
  name: 'SettingsLayout',
  props: ['isLoading', 'noRecordsFound'],
  template:
    '<div class="layout" :data-loading="isLoading" :data-empty="noRecordsFound"><slot name="header" /><slot name="body" /></div>',
};
const BaseSettingsHeader = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery'],
  emits: ['update:searchQuery'],
  template: '<header><slot name="count" /><slot name="actions" /></header>',
};
const MacrosTableRow = {
  name: 'MacrosTableRow',
  props: ['macro', 'canManagePublicMacros'],
  emits: ['delete'],
  template: '<div class="row" :data-admin="canManagePublicMacros">{{ macro.name }}</div>',
};
const WootDeleteModal = {
  name: 'WootDeleteModal',
  props: ['show', 'onClose', 'onConfirm', 'messageValue'],
  template: '<div v-if="show" class="delete-modal">{{ messageValue }}</div>',
};

const mountList = () =>
  mount(MacrosIndex, {
    global: {
      stubs: {
        SettingsLayout,
        BaseSettingsHeader,
        MacrosTableRow,
        WootDeleteModal,
        RouterLink: { template: '<a><slot /></a>' },
        NextButton: true,
        Button: true,
      },
      mocks: { $t: (key, args) => (args ? `${key}:${args.n}` : key) },
    },
  });
const modal = wrapper => wrapper.findComponent(WootDeleteModal);

describe('Macros list behaviour', () => {
  beforeEach(() => {
    env.macros = ref([
      { id: 1, name: 'Close and tag' },
      { id: 2, name: 'Escalate' },
    ]);
    env.flags = ref({ isFetching: false });
    env.dispatch = vi.fn(() => Promise.resolve());
    env.alert = vi.fn();
    env.admin = true;
  });

  it('fetches, counts and searches macros', async () => {
    const wrapper = mountList();
    expect(env.dispatch).toHaveBeenCalledWith('macros/get');
    expect(wrapper.find('.layout').attributes('data-empty')).toBe('false');
    expect(wrapper.find('header span').text()).toBe('MACROS.COUNT:2');
    expect(wrapper.findAll('.row').map(r => r.text())).toEqual(['Close and tag', 'Escalate']);
    expect(wrapper.find('.row').attributes('data-admin')).toBe('true');
    expect(wrapper.find('.table').attributes('data-empty')).toBe('MACROS.LIST.404');

    wrapper.findComponent(BaseSettingsHeader).vm.$emit('update:searchQuery', 'escal');
    await flushPromises();
    expect(wrapper.findAll('.row').map(r => r.text())).toEqual(['Escalate']);
    expect(wrapper.find('.table').attributes('data-empty')).toBe('MACROS.NO_RESULTS');
    wrapper.findComponent(BaseSettingsHeader).vm.$emit('update:searchQuery', '  ');
    await flushPromises();
    expect(wrapper.findAll('.row')).toHaveLength(2);
  });

  it('shows the loading and empty states', () => {
    env.macros.value = [];
    env.flags.value = { isFetching: true };
    env.admin = false;
    const wrapper = mountList();
    expect(wrapper.find('.layout').attributes('data-loading')).toBe('true');
    expect(wrapper.find('.layout').attributes('data-empty')).toBe('true');
    expect(wrapper.find('header span').exists()).toBe(false);
  });

  it('deletes a macro after confirmation and reports the result', async () => {
    const wrapper = mountList();
    wrapper.findAllComponents(MacrosTableRow)[1].vm.$emit('delete');
    await flushPromises();
    expect(modal(wrapper).text()).toBe('Escalate?');
    modal(wrapper).props('onClose')();
    await flushPromises();
    expect(wrapper.find('.delete-modal').exists()).toBe(false);

    wrapper.findAllComponents(MacrosTableRow)[1].vm.$emit('delete');
    await flushPromises();
    modal(wrapper).props('onConfirm')();
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('macros/delete', 2);
    expect(env.alert).toHaveBeenCalledWith('MACROS.DELETE.API.SUCCESS_MESSAGE');
    expect(wrapper.find('.delete-modal').exists()).toBe(false);

    env.dispatch = vi.fn(() => Promise.reject(new Error('nope')));
    modal(wrapper).props('onConfirm')();
    await flushPromises();
    expect(env.alert).toHaveBeenCalledWith('MACROS.DELETE.API.ERROR_MESSAGE');
  });
});
