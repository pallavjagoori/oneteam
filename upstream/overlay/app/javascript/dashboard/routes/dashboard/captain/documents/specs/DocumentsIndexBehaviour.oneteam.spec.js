/**
 * OneTeam behaviour spec for the Captain documents page.
 *
 * Covers fetching per assistant (dropping stale responses), search and
 * filters, card selection and bulk actions, the per-document actions,
 * create / delete flows, pagination and the sync polling loop. The poll
 * timer and debounce are replaced so each step can be driven directly.
 */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import DocumentsIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({ isOnChatwootCloud: computed(() => env.cloud) }),
  };
});
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ checkPermissions: () => env.admin }),
}));
vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  debounce: fn => fn,
}));
vi.mock('@vueuse/core', async importOriginal => {
  const { ref } = await import('vue');
  return {
    ...(await importOriginal()),
    useTimeoutPoll: fn => {
      env.poll = fn;
      const isActive = ref(false);
      env.pollControls = {
        isActive,
        pause: vi.fn(() => {
          isActive.value = false;
        }),
        resume: vi.fn(() => {
          isActive.value = true;
        }),
      };
      return env.pollControls;
    },
  };
});
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  const getters = {
    'captainDocuments/getUIFlags': () => env.state.uiFlags,
    'captainDocuments/getRecords': () => env.state.records,
    'captainDocuments/getMeta': () => env.state.meta,
  };
  return {
    useMapGetter: key => computed(getters[key]),
    useStore: () => env.store,
  };
});
vi.mock('dashboard/api/captain/document', () => ({
  default: { get: vi.fn(params => env.api(params)) },
}));

const { useAlert } = await import('dashboard/composables');
const { default: DocumentAPI } = await import('dashboard/api/captain/document');

const doc = (id, extra = {}) => ({ id, name: `Doc ${id}`, ...extra });

const Layout = {
  name: 'PageLayout',
  props: [
    'totalCount',
    'currentPage',
    'isEmpty',
    'isFetching',
    'showPaginationFooter',
  ],
  emits: ['update:currentPage', 'click'],
  template: `<div>
    <slot name="search" /><slot name="subHeader" /><slot name="knowMore" />
    <slot name="emptyState" /><slot name="paywall" /><slot name="body" /><slot />
  </div>`,
};
const Filter = {
  name: 'DocumentFilter',
  emits: ['change'],
  data: () => ({ hasActiveFilters: false }),
  methods: {
    buildParams(page) {
      return { page, sort: 'name' };
    },
    reset() {
      env.calls.push('filter-reset');
    },
  },
  template: '<div />',
};
const dialogStub = name => ({
  name,
  props: ['entity', 'assistantId'],
  emits: ['deleteSuccess', 'createSuccess', 'close'],
  data: () => ({
    dialogRef: {
      open: () => env.calls.push(`${name}-open`),
    },
  }),
  template: '<div />',
});
const DeleteDialog = dialogStub('DeleteDialog');
const CreateDialog = dialogStub('CreateDocumentDialog');
const Card = {
  name: 'DocumentCard',
  props: [
    'id',
    'name',
    'isSelected',
    'selectable',
    'showSelectionControl',
    'showMenu',
    'syncStaleAfterHours',
  ],
  emits: ['action', 'select', 'hover'],
  template: '<article />',
};
const Bulk = {
  name: 'DocumentBulkActions',
  props: ['selectedIds', 'documents'],
  emits: ['update:selectedIds', 'bulkSyncQueued', 'bulkDeleteSucceeded'],
  template: '<div />',
};
const SearchInput = {
  name: 'Input',
  props: ['modelValue'],
  emits: ['update:modelValue', 'input'],
  template: '<input />',
};
const Details = {
  name: 'DocumentDetails',
  props: ['captainDocument'],
  emits: ['close'],
  template: '<div />',
};
const EmptyState = {
  name: 'DocumentPageEmptyState',
  emits: ['click'],
  template: '<div />',
};

const mountPage = async () => {
  const wrapper = mount(DocumentsIndex, {
    global: {
      mocks: { $t: key => key },
      stubs: {
        PageLayout: Layout,
        Policy: { template: '<div><slot /></div>' },
        DocumentBulkActions: Bulk,
        DocumentFilter: Filter,
        FeatureSpotlightPopover: true,
        DocumentPageEmptyState: EmptyState,
        CaptainPaywall: true,
        LimitBanner: true,
        DocumentCard: Card,
        DocumentDetails: Details,
        CreateDocumentDialog: CreateDialog,
        DeleteDialog,
        Input: SearchInput,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const cards = wrapper => wrapper.findAllComponents(Card);
const apiCalls = () => DocumentAPI.get.mock.calls.map(c => c[0]);
const dispatched = name =>
  env.store.dispatch.mock.calls.filter(c => c[0] === name);
const respond = (payload, meta = { page: 1, totalCount: payload.length }) => ({
  data: { payload, meta },
});

beforeEach(() => {
  env.state = reactive({
    uiFlags: { fetchingList: false },
    records: [],
    meta: {},
  });
  env.route = reactive({ params: { assistantId: '5' } });
  env.cloud = true;
  env.admin = true;
  env.calls = [];
  env.docs = [doc(1), doc(2)];
  env.api = () =>
    Promise.resolve(
      respond(env.docs, {
        page: 1,
        totalCount: env.docs.length,
        sync_interval_hours: '24',
      })
    );
  env.syncResult = () => Promise.resolve();
  env.store = {
    dispatch: vi.fn(async (action, payload) => {
      if (action === 'captainDocuments/setRecords') {
        env.state.records = payload.records;
        env.state.meta = payload.meta;
      }
      if (action === 'captainDocuments/setFetchingList') {
        env.state.uiFlags = { fetchingList: payload };
      }
      if (action === 'captainDocuments/sync') return env.syncResult();
      return undefined;
    }),
  };
  vi.clearAllMocks();
});

describe('Documents fetching', () => {
  it('loads the assistant documents on mount', async () => {
    const wrapper = await mountPage();
    expect(apiCalls()).toEqual([
      { page: 1, sort: 'recently_updated', assistantId: 5 },
    ]);
    expect(dispatched('captainDocuments/setFetchingList')).toEqual([
      ['captainDocuments/setFetchingList', true],
      ['captainDocuments/setFetchingList', false],
    ]);
    expect(cards(wrapper).map(c => c.props('name'))).toEqual([
      'Doc 1',
      'Doc 2',
    ]);
    expect(cards(wrapper)[0].props('syncStaleAfterHours')).toBe(24);
    expect(wrapper.findComponent(Layout).props()).toMatchObject({
      isEmpty: false,
      showPaginationFooter: true,
    });
  });

  it('omits the assistant without one in the route', async () => {
    env.route.params = {};
    env.api = () =>
      Promise.resolve(
        respond([doc(1, { name: '', external_link: 'https://x' })], { page: 1 })
      );
    const wrapper = await mountPage();
    expect(apiCalls()[0]).toEqual({ page: 1, sort: 'recently_updated' });
    expect(cards(wrapper)[0].props('name')).toBe('https://x');
    expect(cards(wrapper)[0].props('syncStaleAfterHours')).toBe(null);
  });

  it('refetches with filters when the assistant changes', async () => {
    await mountPage();
    env.route.params = { assistantId: '6' };
    await flushPromises();
    expect(env.calls).toContain('filter-reset');
    expect(apiCalls()[1]).toEqual({ page: 1, sort: 'name', assistantId: 6 });
  });

  it('drops responses and errors for a previous assistant', async () => {
    let finishOld;
    let failOld;
    env.api = () =>
      new Promise((resolve, reject) => {
        finishOld = resolve;
        failOld = reject;
      });
    const wrapper = mount(DocumentsIndex, {
      global: {
        mocks: { $t: key => key },
        stubs: {
          PageLayout: Layout,
          Policy: true,
          DocumentFilter: Filter,
          DocumentCard: Card,
          FeatureSpotlightPopover: true,
          LimitBanner: true,
          CaptainPaywall: true,
          DocumentPageEmptyState: true,
          Input: SearchInput,
        },
      },
    });
    const first = { resolve: finishOld, reject: failOld };
    env.api = () => Promise.resolve(respond([doc(9)]));
    env.route.params = { assistantId: '7' };
    await flushPromises();
    first.resolve(respond([doc(1)]));
    await flushPromises();
    expect(cards(wrapper).map(c => c.props('id'))).toEqual([9]);
    // The old request's loader flag no longer belongs to it either.
    expect(dispatched('captainDocuments/setFetchingList').at(-1)).toEqual([
      'captainDocuments/setFetchingList',
      false,
    ]);
    first.reject(new Error('late'));
  });

  it('swallows a stale failure', async () => {
    let failOld;
    env.api = () =>
      new Promise((resolve, reject) => {
        failOld = reject;
      });
    await mountPage();
    const reject = failOld;
    env.api = () => Promise.resolve(respond([doc(9)]));
    env.route.params = { assistantId: '8' };
    await flushPromises();
    reject(new Error('late'));
    await flushPromises();
    expect(apiCalls()).toHaveLength(2);
  });

  it('searches with a trimmed query and shows the filtered empty state', async () => {
    const wrapper = await mountPage();
    env.api = () => Promise.resolve(respond([]));
    const input = wrapper.findComponent(SearchInput);
    await input.vm.$emit('update:modelValue', '  refund  ');
    await input.vm.$emit('input');
    await flushPromises();
    expect(apiCalls().at(-1)).toEqual({
      page: 1,
      sort: 'name',
      assistantId: 5,
      searchKey: 'refund',
    });
    expect(wrapper.text()).toContain(
      'CAPTAIN.DOCUMENTS.EMPTY_STATE.FILTERED_TITLE'
    );
    expect(wrapper.findComponent(Layout).props('isEmpty')).toBe(false);
  });

  it('refetches from page one when filters change', async () => {
    const wrapper = await mountPage();
    const filter = wrapper.findComponent(Filter);
    filter.vm.hasActiveFilters = true;
    env.api = () => Promise.resolve(respond([]));
    await filter.vm.$emit('change');
    await flushPromises();
    expect(apiCalls().at(-1)).toEqual({
      page: 1,
      sort: 'name',
      assistantId: 5,
    });
    expect(wrapper.findComponent(Layout).props('isEmpty')).toBe(false);
  });

  it('is empty with no documents and no filters', async () => {
    env.docs = [];
    const wrapper = await mountPage();
    expect(wrapper.findComponent(Layout).props('isEmpty')).toBe(true);
    await wrapper.findComponent(EmptyState).vm.$emit('click');
    await flushPromises();
    expect(env.calls).toContain('CreateDocumentDialog-open');
  });
});

describe('Documents selection and bulk actions', () => {
  it('shows selection controls on hover and toggles selection', async () => {
    const wrapper = await mountPage();
    const [first, second] = cards(wrapper);
    expect(first.props('showSelectionControl')).toBe(false);
    await first.vm.$emit('hover', true);
    expect(first.props('showSelectionControl')).toBe(true);
    await first.vm.$emit('hover', false);
    expect(first.props('showSelectionControl')).toBe(false);

    await first.vm.$emit('select', 1);
    expect(first.props('isSelected')).toBe(true);
    expect(first.props('showMenu')).toBe(false);
    expect(second.props('showSelectionControl')).toBe(true);
    expect(wrapper.findComponent(SearchInput).exists()).toBe(false);
    await first.vm.$emit('select', 1);
    expect(first.props('isSelected')).toBe(false);
  });

  it('does not let non-admins select', async () => {
    env.admin = false;
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('select', 1);
    expect(cards(wrapper)[0].props('isSelected')).toBe(false);
    await cards(wrapper)[0].vm.$emit('hover', true);
    expect(cards(wrapper)[0].props('showSelectionControl')).toBe(false);
  });

  it('prunes the selection to documents still shown', async () => {
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('select', 1);
    await cards(wrapper)[1].vm.$emit('select', 2);
    env.docs = [doc(2)];
    await wrapper.findComponent(Bulk).vm.$emit('bulkSyncQueued');
    // A create refresh keeps selection but prunes missing ids.
    await wrapper.findComponent(Layout).vm.$emit('click');
    await flushPromises();
    await wrapper.findComponent(CreateDialog).vm.$emit('createSuccess');
    await flushPromises();
    expect(wrapper.findComponent(Bulk).props('selectedIds')).toEqual(
      new Set([2])
    );
    // Same ids again leave the set untouched.
    await wrapper.findComponent(CreateDialog).vm.$emit('createSuccess');
    await flushPromises();
    expect(wrapper.findComponent(Bulk).props('selectedIds')).toEqual(
      new Set([2])
    );
  });

  it('updates the selection from the bulk bar', async () => {
    const wrapper = await mountPage();
    await wrapper
      .findComponent(Bulk)
      .vm.$emit('update:selectedIds', new Set([1, 2]));
    expect(cards(wrapper).map(c => c.props('isSelected'))).toEqual([
      true,
      true,
    ]);
  });

  it.each([
    [[], 2, 1],
    [[], 1, 1],
    [[doc(3)], 2, 2],
  ])(
    'refetches after a bulk delete (left %o on page %i)',
    async (left, page, expected) => {
      const wrapper = await mountPage();
      env.state.records = left;
      env.state.meta = { page };
      await wrapper.findComponent(Bulk).vm.$emit('bulkDeleteSucceeded');
      await flushPromises();
      expect(apiCalls().at(-1).page).toBe(expected);
    }
  );
});

describe('Documents per-card actions', () => {
  it('opens the delete dialog and refreshes after deleting', async () => {
    const wrapper = await mountPage();
    await cards(wrapper)[1].vm.$emit('action', { action: 'delete', id: 2 });
    await flushPromises();
    expect(env.calls).toContain('DeleteDialog-open');
    expect(wrapper.findComponent(DeleteDialog).props('entity')).toEqual(doc(2));

    env.state.meta = { page: 1 };
    await wrapper.findComponent(DeleteDialog).vm.$emit('deleteSuccess');
    await flushPromises();
    expect(apiCalls().at(-1).page).toBe(1);
  });

  it('goes back a page when the last document on a page is deleted', async () => {
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('action', { action: 'delete', id: 1 });
    await flushPromises();
    await cards(wrapper)[0].vm.$emit('select', 1);
    env.state.records = [];
    env.state.meta = { page: 3 };
    await wrapper.findComponent(DeleteDialog).vm.$emit('deleteSuccess');
    await flushPromises();
    expect(apiCalls().at(-1).page).toBe(2);
  });

  it('refreshes the first page when meta has no page', async () => {
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('action', { action: 'delete', id: 1 });
    await flushPromises();
    env.state.meta = {};
    await wrapper.findComponent(DeleteDialog).vm.$emit('deleteSuccess');
    await flushPromises();
    expect(apiCalls().at(-1).page).toBe(1);
  });

  it('shows and closes document details', async () => {
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('action', {
      action: 'viewDetails',
      id: 1,
    });
    await flushPromises();
    const details = wrapper.findComponent(Details);
    expect(details.props('captainDocument')).toEqual(doc(1));
    await details.vm.$emit('close');
    expect(wrapper.findComponent(Details).exists()).toBe(false);
  });

  it('ignores unknown actions', async () => {
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('action', { action: 'other', id: 1 });
    await flushPromises();
    expect(env.calls).toEqual([]);
  });

  it('queues a sync and starts polling', async () => {
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('action', { action: 'sync', id: 1 });
    await flushPromises();
    expect(dispatched('captainDocuments/sync')[0][1]).toBe(1);
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.DOCUMENTS.SYNC.QUEUED_MESSAGE'
    );
    expect(env.pollControls.resume).toHaveBeenCalledTimes(1);
  });

  it('reports a failed sync', async () => {
    env.syncResult = () => Promise.reject(new Error('x'));
    const wrapper = await mountPage();
    await cards(wrapper)[0].vm.$emit('action', { action: 'sync', id: 1 });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CAPTAIN.DOCUMENTS.SYNC.ERROR_MESSAGE'
    );
  });

  it('creates documents and closes the dialog', async () => {
    const wrapper = await mountPage();
    await wrapper.findComponent(Layout).vm.$emit('click');
    await flushPromises();
    const dialog = wrapper.findComponent(CreateDialog);
    expect(dialog.props('assistantId')).toBe(5);
    await dialog.vm.$emit('close');
    expect(wrapper.findComponent(CreateDialog).exists()).toBe(false);
  });

  it('swallows refresh failures after creating', async () => {
    const wrapper = await mountPage();
    await wrapper.findComponent(Layout).vm.$emit('click');
    await flushPromises();
    env.api = () => Promise.reject(new Error('down'));
    await wrapper.findComponent(CreateDialog).vm.$emit('createSuccess');
    await flushPromises();
    expect(apiCalls().at(-1)).toMatchObject({ page: 1 });
  });

  it('changes pages and clears any selection', async () => {
    const wrapper = await mountPage();
    await wrapper.findComponent(Layout).vm.$emit('update:currentPage', 2);
    await flushPromises();
    expect(apiCalls().at(-1).page).toBe(2);
    await cards(wrapper)[0].vm.$emit('select', 1);
    await wrapper.findComponent(Layout).vm.$emit('update:currentPage', 3);
    await flushPromises();
    expect(cards(wrapper)[0].props('isSelected')).toBe(false);
  });
});

describe('Documents sync polling', () => {
  it('polls while documents sync and stops once they finish', async () => {
    env.docs = [doc(1, { sync_in_progress: true })];
    const wrapper = await mountPage();
    expect(env.pollControls.resume).toHaveBeenCalledTimes(1);

    await env.poll();
    expect(env.pollControls.pause).toHaveBeenCalledTimes(1);
    expect(env.pollControls.isActive.value).toBe(true);

    env.docs = [doc(1)];
    await env.poll();
    expect(env.pollControls.isActive.value).toBe(false);
    expect(apiCalls().at(-1)).toMatchObject({ page: 1 });
    wrapper.unmount();
  });

  it('keeps the window running for extra sync requests while active', async () => {
    env.docs = [doc(1, { sync_in_progress: true })];
    const wrapper = await mountPage();
    await wrapper.findComponent(Bulk).vm.$emit('bulkSyncQueued');
    expect(env.pollControls.resume).toHaveBeenCalledTimes(1);
  });

  it('stops polling after the maximum window', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);
    env.docs = [doc(1, { sync_in_progress: true })];
    await mountPage();
    now.mockReturnValue(16 * 60 * 1000);
    await env.poll();
    expect(env.pollControls.isActive.value).toBe(false);
    now.mockRestore();
  });

  it('keeps polling through a failed refresh', async () => {
    env.docs = [doc(1, { sync_in_progress: true })];
    await mountPage();
    env.api = () => Promise.reject(new Error('down'));
    await env.poll();
    expect(env.pollControls.isActive.value).toBe(true);
  });

  it('starts polling when a refresh reveals syncing documents', async () => {
    const wrapper = await mountPage();
    expect(env.pollControls.resume).not.toHaveBeenCalled();
    env.docs = [doc(1, { sync_in_progress: true })];
    await wrapper.findComponent(Layout).vm.$emit('update:currentPage', 1);
    await flushPromises();
    expect(env.pollControls.resume).toHaveBeenCalledTimes(1);
    // Records going back to idle does not schedule anything.
    env.state.records = [doc(1)];
    await flushPromises();
    expect(env.pollControls.resume).toHaveBeenCalledTimes(1);
  });

  it('stops polling on unmount', async () => {
    const wrapper = await mountPage();
    wrapper.unmount();
    expect(env.pollControls.pause).toHaveBeenCalled();
  });
});
