/**
 * OneTeam behaviour specs for the contacts list page: what it fetches for
 * each view (all, active, label, segment, applied filters, search), paging
 * and infinite search scroll, sorting saved to UI settings, empty states,
 * selection and the bulk label and delete actions. Children are stubs.
 */
import { flushPromises, shallowMount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import BulkActionsAPI from 'dashboard/api/bulkActions';
import { nextTick, reactive } from 'vue';
import { createStore } from 'vuex';
import ContactsIndex from '../ContactsIndex.vue';

const route = reactive({
  name: 'contacts_dashboard_index',
  params: {},
  query: {},
});
const router = {
  replace: vi.fn(({ query }) => {
    route.query = query;
  }),
};
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}));
vi.mock('dashboard/composables', async importOriginal => ({
  ...(await importOriginal()),
  useAlert: vi.fn(),
}));
vi.mock('dashboard/api/bulkActions', () => ({ default: { create: vi.fn() } }));

const SEGMENT = { id: 3, name: 'Leads', query: { payload: [{ a: 1 }] } };
const contact = id => ({ id, name: `Contact ${id}` });

const buildStore = overrides => {
  const state = reactive({
    contacts: [contact(1), contact(2)],
    fetching: false,
    segmentsFetching: false,
    segments: [SEGMENT],
    appliedFilters: [],
    meta: { currentPage: 1, count: 2, hasMore: false },
    uiSettings: {},
    ...overrides,
  });
  const store = createStore({
    getters: {
      'contacts/getContactsList': () => state.contacts,
      'contacts/getUIFlags': () => ({ isFetching: state.fetching }),
      'customViews/getUIFlags': () => ({ isFetching: state.segmentsFetching }),
      'customViews/getContactCustomViews': () => state.segments,
      'contacts/getAppliedContactFilters': () => state.appliedFilters,
      'contacts/getMeta': () => state.meta,
      getUISettings: () => state.uiSettings,
    },
  });
  store.dispatch = vi.fn((action, payload) => {
    if (action === 'updateUISettings') {
      state.uiSettings = payload.uiSettings;
    }
    return Promise.resolve();
  });
  return { store, state };
};

const dialog = { open: vi.fn(), close: vi.fn() };
const LAYOUT_PROPS = [
  'searchValue',
  'headerTitle',
  'currentPage',
  'totalItems',
  'showPaginationFooter',
  'activeSort',
  'activeOrdering',
  'activeSegment',
  'segmentsId',
  'isFetchingList',
  'hasAppliedFilters',
  'useInfiniteScroll',
  'hasMore',
  'isLoadingMore',
];

// Pages share the mocked route, so earlier pages must not keep reacting.
const mounted = [];
const mountPage = ({
  name,
  params = {},
  query = {},
  ...storeOverrides
} = {}) => {
  route.name = name || 'contacts_dashboard_index';
  route.params = params;
  route.query = query;
  const { store, state } = buildStore(storeOverrides);
  const wrapper = shallowMount(ContactsIndex, {
    global: {
      plugins: [store],
      stubs: {
        ContactsListLayout: {
          name: 'ContactsListLayout',
          props: LAYOUT_PROPS,
          template: '<div><slot /></div>',
        },
        Dialog: {
          name: 'Dialog',
          props: ['title', 'description', 'confirmButtonLabel', 'isLoading'],
          template: '<div />',
          methods: { open: () => dialog.open(), close: () => dialog.close() },
        },
      },
    },
  });
  mounted.push(wrapper);
  return { wrapper, store, state };
};

const layout = wrapper => wrapper.findComponent({ name: 'ContactsListLayout' });
const calls = (store, name) =>
  store.dispatch.mock.calls
    .filter(([action]) => action === name)
    .map(([, p]) => p);
const lastCall = (store, name) => calls(store, name).at(-1);
const settle = async () => {
  await vi.advanceTimersByTimeAsync(400);
  await flushPromises();
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  dialog.open = vi.fn();
  dialog.close = vi.fn();
  BulkActionsAPI.create.mockResolvedValue({});
});

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount());
  vi.useRealTimers();
});

describe('ContactsIndex behaviour', () => {
  describe('fetching per view', () => {
    it('fetches all contacts on the index with the saved sort', async () => {
      const { store, wrapper } = mountPage({
        uiSettings: { contacts_sort_by: 'name' },
        query: { page: '2' },
      });
      await flushPromises();
      expect(lastCall(store, 'contacts/get')).toEqual({
        page: 2,
        sortAttr: 'name',
        label: undefined,
      });
      expect(route.query.page).toBe('2');
      expect(layout(wrapper).props('headerTitle')).toBe(
        'CONTACTS_LAYOUT.HEADER.TITLE'
      );
      expect(layout(wrapper).props('activeSort')).toBe('name');
    });

    it('fetches active contacts on the active view', async () => {
      const { store, wrapper } = mountPage({
        name: 'contacts_dashboard_active',
      });
      await flushPromises();
      expect(lastCall(store, 'contacts/active')).toEqual({
        page: 1,
        sortAttr: '-last_activity_at',
      });
      expect(layout(wrapper).props('headerTitle')).toBe(
        'CONTACTS_LAYOUT.HEADER.ACTIVE_TITLE'
      );
    });

    it('runs the segment query on a segment view', async () => {
      const { store, wrapper } = mountPage({ params: { segmentId: '3' } });
      await flushPromises();
      expect(lastCall(store, 'contacts/filter')).toEqual({
        page: 1,
        sortAttr: '-last_activity_at',
        label: undefined,
        queryPayload: SEGMENT.query,
      });
      expect(layout(wrapper).props('headerTitle')).toBe('Leads');
    });

    it('waits for an unknown segment to load', async () => {
      const { store } = mountPage({ params: { segmentId: '99' } });
      await flushPromises();
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('searches when the URL has a search term', async () => {
      const { store, wrapper } = mountPage({ query: { search: 'ada' } });
      await settle();
      expect(lastCall(store, 'contacts/search')).toMatchObject({
        search: 'ada',
        page: 1,
        append: false,
      });
      expect(layout(wrapper).props('headerTitle')).toBe(
        'CONTACTS_LAYOUT.HEADER.SEARCH_TITLE'
      );
      expect(layout(wrapper).props('useInfiniteScroll')).toBe(true);
    });

    it('names a label view and refetches when the label changes', async () => {
      const { store, wrapper } = mountPage({ params: { label: 'vip' } });
      await flushPromises();
      expect(layout(wrapper).props('headerTitle')).toBe('#vip');
      route.params = { label: 'lead' };
      await flushPromises();
      expect(lastCall(store, 'contacts/get').label).toBe('lead');
    });

    it('refetches by context when moving between views', async () => {
      const { store, state } = mountPage();
      await flushPromises();
      route.name = 'contacts_dashboard_active';
      await flushPromises();
      expect(calls(store, 'contacts/active')).toHaveLength(1);

      route.name = 'contacts_dashboard_index';
      state.appliedFilters = [
        { attributeKey: 'name', filterOperator: 'equal_to', values: 'Ada' },
      ];
      route.params = { segmentId: '3' };
      await flushPromises();
      expect(lastCall(store, 'contacts/filter').queryPayload).toEqual(
        SEGMENT.query
      );

      route.params = {};
      await flushPromises();
      // Applied filters without a segment are turned into a query.
      expect(lastCall(store, 'contacts/filter').queryPayload).toEqual(
        expect.objectContaining({ payload: expect.any(Array) })
      );
    });

    it('does not refetch while a list is already loading', async () => {
      const { store, state } = mountPage();
      await flushPromises();
      state.fetching = true;
      store.dispatch.mockClear();
      route.name = 'contacts_dashboard_active';
      await flushPromises();
      expect(calls(store, 'contacts/active')).toEqual([]);
    });

    it('searches again from the context when a search is in the URL', async () => {
      const { store } = mountPage({ query: { search: 'ada' } });
      await settle();
      store.dispatch.mockClear();
      route.params = { label: 'vip' };
      await settle();
      expect(lastCall(store, 'contacts/search')).toMatchObject({
        label: 'vip',
      });
    });
  });

  describe('search', () => {
    it('searches from the layout and clears back to all contacts', async () => {
      const { store, wrapper } = mountPage();
      await flushPromises();
      layout(wrapper).vm.$emit('search', 'bob');
      await settle();
      expect(lastCall(store, 'contacts/search').search).toBe('bob');
      expect(route.query.search).toBe('bob');

      store.dispatch.mockClear();
      layout(wrapper).vm.$emit('search', '');
      await settle();
      // Chatwoot quirk (see FINDINGS.md): clearing the search fetches the
      // list itself, and dropping `search` from the URL fetches it again.
      expect(calls(store, 'contacts/get')).toHaveLength(2);
      expect(route.query.search).toBeUndefined();
    });

    it('loads more search results once at a time while there are more', async () => {
      const { store, wrapper, state } = mountPage({ query: { search: 'ada' } });
      await settle();
      state.meta = { currentPage: 1, count: 40, hasMore: true };
      layout(wrapper).vm.$emit('loadMore');
      layout(wrapper).vm.$emit('loadMore');
      await flushPromises();
      expect(calls(store, 'contacts/search').filter(p => p.append)).toEqual([
        expect.objectContaining({ page: 2, search: 'ada', append: true }),
      ]);

      state.meta = { hasMore: false };
      store.dispatch.mockClear();
      layout(wrapper).vm.$emit('loadMore');
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('resets to all contacts when the search is cleared from the sidebar', async () => {
      const { store } = mountPage({ query: { search: 'ada' } });
      await settle();
      store.dispatch.mockClear();
      route.query = {};
      await flushPromises();
      expect(calls(store, 'contacts/get')).toHaveLength(1);
    });

    it('keeps the current view when the search is cleared on a filtered view', async () => {
      const { store, state } = mountPage({ query: { search: 'ada' } });
      await settle();
      state.appliedFilters = [{ attributeKey: 'name' }];
      store.dispatch.mockClear();
      route.query = {};
      await flushPromises();
      expect(calls(store, 'contacts/get')).toEqual([]);

      state.fetching = true;
      route.query = { search: 'x' };
      await flushPromises();
      expect(calls(store, 'contacts/search')).toEqual([]);
    });
  });

  describe('paging and sorting', () => {
    it('fetches the requested page without clearing the selection', async () => {
      const { store, wrapper } = mountPage();
      await flushPromises();
      wrapper
        .findComponent({ name: 'ContactsList' })
        .vm.$emit('toggleContact', {
          id: 1,
        });
      layout(wrapper).vm.$emit('update:currentPage', 3);
      await flushPromises();
      expect(lastCall(store, 'contacts/get').page).toBe(3);
      expect(
        wrapper
          .findComponent({ name: 'ContactsList' })
          .props('selectedContactIds')
      ).toEqual([1]);
    });

    it('saves the sort and refetches for each view', async () => {
      const index = mountPage();
      await flushPromises();
      layout(index.wrapper).vm.$emit('update:sort', {
        sort: 'name',
        order: '-',
      });
      await flushPromises();
      expect(lastCall(index.store, 'updateUISettings')).toEqual({
        uiSettings: { contacts_sort_by: '-name' },
      });
      expect(lastCall(index.store, 'contacts/get').sortAttr).toBe('-name');

      const active = mountPage({ name: 'contacts_dashboard_active' });
      await flushPromises();
      layout(active.wrapper).vm.$emit('update:sort', {
        sort: 'name',
        order: '',
      });
      await flushPromises();
      expect(lastCall(active.store, 'contacts/active').sortAttr).toBe('name');

      const segment = mountPage({ params: { segmentId: '3' } });
      await flushPromises();
      layout(segment.wrapper).vm.$emit('update:sort', {
        sort: 'email',
        order: '',
      });
      await flushPromises();
      expect(lastCall(segment.store, 'contacts/filter')).toMatchObject({
        sortAttr: 'email',
        queryPayload: SEGMENT.query,
      });

      const filtered = mountPage({
        appliedFilters: [
          { attributeKey: 'name', filterOperator: 'equal_to', values: 'A' },
        ],
      });
      await flushPromises();
      layout(filtered.wrapper).vm.$emit('update:sort', {
        sort: 'email',
        order: '',
      });
      await flushPromises();
      expect(calls(filtered.store, 'contacts/filter')).toHaveLength(1);

      const search = mountPage({ query: { search: 'ada' } });
      await settle();
      layout(search.wrapper).vm.$emit('update:sort', {
        sort: 'email',
        order: '',
      });
      await settle();
      expect(lastCall(search.store, 'contacts/search').sortAttr).toBe('email');
    });

    it('applies and clears filters from the layout', async () => {
      const { store, wrapper } = mountPage({
        appliedFilters: [{ attributeKey: 'name' }],
      });
      await flushPromises();
      layout(wrapper).vm.$emit('applyFilter', { payload: [] });
      await flushPromises();
      expect(lastCall(store, 'contacts/filter').queryPayload).toEqual({
        payload: [],
      });
      layout(wrapper).vm.$emit('clearFilters');
      await flushPromises();
      expect(
        calls(store, 'contacts/clearContactFilters').length
      ).toBeGreaterThan(0);
    });

    it('ignores filter requests with nothing to filter by', async () => {
      const { store, wrapper } = mountPage();
      await flushPromises();
      layout(wrapper).vm.$emit('applyFilter', {});
      await flushPromises();
      expect(calls(store, 'contacts/filter')).toEqual([]);
    });
  });

  describe('empty states', () => {
    it('shows the create-contact state on an empty first page', async () => {
      const { wrapper, store } = mountPage({ contacts: [] });
      const empty = wrapper.findComponent({ name: 'ContactEmptyState' });
      expect(empty.exists()).toBe(true);
      empty.vm.$emit('create', { name: 'New' });
      expect(lastCall(store, 'contacts/create')).toEqual({ name: 'New' });
    });

    it.each([
      [{ name: 'contacts_dashboard_active' }, 'ACTIVE_EMPTY_STATE_TITLE'],
      [{ query: { search: 'zzz' } }, 'SEARCH_EMPTY_STATE_TITLE'],
      [
        { appliedFilters: [{ attributeKey: 'name' }] },
        'LIST_EMPTY_STATE_TITLE',
      ],
    ])('explains an empty list for %o', (options, key) => {
      const { wrapper } = mountPage({ contacts: [], ...options });
      expect(wrapper.text()).toContain(`CONTACTS_LAYOUT.EMPTY_STATE.${key}`);
    });

    it('shows a spinner while loading, except over search results', () => {
      const loading = mountPage({ fetching: true });
      expect(loading.wrapper.findComponent({ name: 'Spinner' }).exists()).toBe(
        true
      );
      const searching = mountPage({
        segmentsFetching: true,
        query: { search: 'ada' },
      });
      expect(
        searching.wrapper.findComponent({ name: 'Spinner' }).exists()
      ).toBe(false);
    });
  });

  describe('selection and bulk actions', () => {
    const select = async (wrapper, ids) => {
      ids.forEach(id =>
        wrapper
          .findComponent({ name: 'ContactsList' })
          .vm.$emit('toggleContact', {
            id,
          })
      );
      await nextTick();
    };
    const bar = wrapper =>
      wrapper.findComponent({ name: 'ContactsBulkActionBar' });

    it('toggles single contacts and all visible contacts', async () => {
      const { wrapper } = mountPage();
      await flushPromises();
      await select(wrapper, [1]);
      expect(bar(wrapper).props('selectedContactIds')).toEqual([1]);
      wrapper
        .findComponent({ name: 'ContactsList' })
        .vm.$emit('toggleContact', { id: 1, value: true });
      wrapper
        .findComponent({ name: 'ContactsList' })
        .vm.$emit('toggleContact', { id: 1, value: false });
      await nextTick();
      expect(bar(wrapper).exists()).toBe(false);
      expect(dialog.close).toHaveBeenCalled();

      await select(wrapper, [2]);
      bar(wrapper).vm.$emit('toggleAll', true);
      await nextTick();
      expect(bar(wrapper).props('selectedContactIds')).toEqual([2, 1]);
      bar(wrapper).vm.$emit('toggleAll', false);
      await nextTick();
      expect(bar(wrapper).exists()).toBe(false);

      await select(wrapper, [1]);
      bar(wrapper).vm.$emit('clearSelection');
      await nextTick();
      expect(bar(wrapper).exists()).toBe(false);
    });

    it('describes the delete dialog for one or several contacts', async () => {
      const { wrapper } = mountPage();
      await flushPromises();
      await select(wrapper, [1]);
      const dialogStub = () => wrapper.findComponent({ name: 'Dialog' });
      expect(dialogStub().props('title')).toBe(
        'CONTACTS_BULK_ACTIONS.DELETE_DIALOG.SINGULAR_TITLE'
      );
      expect(dialogStub().props('confirmButtonLabel')).toBe(
        'CONTACTS_BULK_ACTIONS.DELETE_DIALOG.CONFIRM_SINGLE'
      );
      await select(wrapper, [2]);
      expect(dialogStub().props('title')).toBe(
        'CONTACTS_BULK_ACTIONS.DELETE_DIALOG.TITLE'
      );
      expect(dialogStub().props('description')).toBe(
        'CONTACTS_BULK_ACTIONS.DELETE_DIALOG.DESCRIPTION'
      );
      expect(dialogStub().props('confirmButtonLabel')).toBe(
        'CONTACTS_BULK_ACTIONS.DELETE_DIALOG.CONFIRM_MULTIPLE'
      );
      bar(wrapper).vm.$emit('deleteSelected');
      expect(dialog.open).toHaveBeenCalled();
    });

    it('adds and removes labels in bulk, then refetches', async () => {
      const { wrapper, store } = mountPage();
      await flushPromises();
      await select(wrapper, [1, 2]);
      bar(wrapper).vm.$emit('assignLabels', ['vip']);
      await flushPromises();
      expect(BulkActionsAPI.create).toHaveBeenLastCalledWith({
        type: 'Contact',
        ids: [1, 2],
        labels: { add: ['vip'] },
      });
      expect(useAlert).toHaveBeenCalledWith(
        'CONTACTS_BULK_ACTIONS.ASSIGN_LABELS_SUCCESS'
      );

      await select(wrapper, [1]);
      bar(wrapper).vm.$emit('removeLabels', ['vip']);
      await flushPromises();
      expect(BulkActionsAPI.create).toHaveBeenLastCalledWith({
        type: 'Contact',
        ids: [1],
        labels: { remove: ['vip'] },
      });
      expect(calls(store, 'contacts/get').length).toBeGreaterThan(2);
    });

    it('reports label failures and ignores empty requests', async () => {
      const { wrapper } = mountPage();
      await flushPromises();
      await select(wrapper, [1]);
      BulkActionsAPI.create.mockRejectedValue(new Error('nope'));
      bar(wrapper).vm.$emit('assignLabels', ['vip']);
      await flushPromises();
      bar(wrapper).vm.$emit('removeLabels', ['vip']);
      await flushPromises();
      bar(wrapper).vm.$emit('assignLabels', []);
      bar(wrapper).vm.$emit('removeLabels', []);
      expect(useAlert.mock.calls.map(([m]) => m)).toEqual([
        'CONTACTS_BULK_ACTIONS.ASSIGN_LABELS_FAILED',
        'CONTACTS_BULK_ACTIONS.REMOVE_LABELS_FAILED',
      ]);
      expect(BulkActionsAPI.create).toHaveBeenCalledTimes(2);
    });

    it('deletes the selected contacts after confirming', async () => {
      const { wrapper } = mountPage();
      await flushPromises();
      await select(wrapper, [1, 2]);
      wrapper.findComponent({ name: 'Dialog' }).vm.$emit('confirm');
      await flushPromises();
      expect(BulkActionsAPI.create).toHaveBeenCalledWith({
        type: 'Contact',
        ids: [1, 2],
        action_name: 'delete',
      });
      expect(useAlert).toHaveBeenCalledWith(
        'CONTACTS_BULK_ACTIONS.DELETE_SUCCESS'
      );
    });

    it('reports a failed delete', async () => {
      const { wrapper } = mountPage();
      await flushPromises();
      await select(wrapper, [1]);
      BulkActionsAPI.create.mockRejectedValue(new Error('nope'));
      wrapper.findComponent({ name: 'Dialog' }).vm.$emit('confirm');
      await flushPromises();
      expect(useAlert).toHaveBeenCalledWith(
        'CONTACTS_BULK_ACTIONS.DELETE_FAILED'
      );
    });

    it('does nothing for bulk actions without a selection', async () => {
      const { wrapper } = mountPage();
      await flushPromises();
      await select(wrapper, [1]);
      const confirm = wrapper.findComponent({ name: 'Dialog' });
      bar(wrapper).vm.$emit('clearSelection');
      await nextTick();
      confirm.vm.$emit('confirm');
      expect(BulkActionsAPI.create).not.toHaveBeenCalled();
      expect(dialog.open).not.toHaveBeenCalled();
    });
  });
});
