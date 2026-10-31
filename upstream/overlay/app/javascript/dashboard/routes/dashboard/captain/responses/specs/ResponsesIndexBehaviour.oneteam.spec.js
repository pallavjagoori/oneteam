/**
 * OneTeam behaviour spec for the Captain FAQ responses page.
 *
 * Covers loading per assistant from the URL (page and search), superseded
 * and failed requests, search, card actions (edit, delete, usage drawer,
 * conversation links), bulk selection and deletion with page fallback,
 * the FAQ suggestions banner, and pagination.
 */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import ResponsesIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, arg) =>
      arg === undefined ? key : `${key}:${JSON.stringify(arg)}`,
  }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useAccount', async () => {
  const { computed } = await import('vue');
  return {
    useAccount: () => ({ isOnChatwootCloud: computed(() => env.cloud) }),
  };
});
vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  debounce: fn => fn,
}));
vi.mock('dashboard/api/captain/response', () => ({
  default: {
    get: vi.fn(params => env.api(params)),
    getDrilldown: vi.fn(async () => ({ data: [] })),
  },
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  const getters = {
    'captainResponses/getUIFlags': () => env.state.uiFlags,
    'captainResponses/getMeta': () => env.state.meta,
    'captainResponses/getRecords': () => env.state.records,
    'captainFaqSuggestions/getOpenCount': () => env.state.suggestions,
  };
  return {
    useMapGetter: key => computed(getters[key]),
    useStore: () => env.store,
  };
});

const { useAlert } = await import('dashboard/composables');
const { default: API } = await import('dashboard/api/captain/response');

const Layout = {
  name: 'PageLayout',
  props: [
    'totalCount',
    'currentPage',
    'isEmpty',
    'isFetching',
    'showPaginationFooter',
    'featureFlag',
  ],
  emits: ['update:currentPage', 'click'],
  template: `<div>
    <slot name="knowMore" /><slot name="search" /><slot name="subHeader" />
    <slot name="emptyState" /><slot name="paywall" /><slot name="body" /><slot />
  </div>`,
};
const dialogStub = name => ({
  name,
  props: ['entity', 'type', 'bulkIds', 'selectedResponse'],
  emits: ['deleteSuccess', 'close'],
  data: () => ({ dialogRef: { open: () => env.calls.push(`${name}-open`) } }),
  template: '<div />',
});
const Card = {
  name: 'ResponseCard',
  props: ['id', 'question', 'isSelected', 'selectable', 'showMenu'],
  emits: ['action', 'navigate', 'select', 'hover', 'viewConversations'],
  template: '<article />',
};
const Bulk = {
  name: 'BulkSelectBar',
  props: ['modelValue', 'allItems', 'selectAllLabel', 'selectedCountLabel'],
  emits: ['update:modelValue', 'bulkDelete'],
  template: '<div class="bulk" />',
};
const Drawer = {
  name: 'ConversationUsageDrawer',
  props: ['open', 'resourceId', 'title', 'conversationCount', 'fetcher'],
  emits: ['close'],
  template: '<div />',
};

const response = (id, extra = {}) => ({
  id,
  question: `Q${id}`,
  used_in_conversations_count: id,
  ...extra,
});
const respond = (payload, meta = { page: 1, totalCount: payload.length }) => ({
  data: { payload, meta },
});

const mountPage = async () => {
  const wrapper = mount(ResponsesIndex, {
    global: {
      stubs: {
        PageLayout: Layout,
        FeatureSpotlightPopover: {
          name: 'FeatureSpotlightPopover',
          props: ['hideActions'],
          template: '<div />',
        },
        Input: {
          name: 'Input',
          props: ['modelValue'],
          emits: ['update:modelValue', 'input'],
          template: '<input class="search" />',
        },
        BulkSelectBar: Bulk,
        ResponsePageEmptyState: {
          name: 'ResponsePageEmptyState',
          emits: ['click'],
          template: '<div />',
        },
        CaptainPaywall: true,
        LimitBanner: true,
        Banner: {
          name: 'Banner',
          emits: ['action'],
          template: '<div class="banner"><slot /></div>',
        },
        ResponseCard: Card,
        ConversationUsageDrawer: Drawer,
        DeleteDialog: dialogStub('DeleteDialog'),
        BulkDeleteDialog: dialogStub('BulkDeleteDialog'),
        CreateResponseDialog: dialogStub('CreateResponseDialog'),
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const cards = wrapper => wrapper.findAllComponents(Card);
const dispatched = name =>
  env.store.dispatch.mock.calls.filter(c => c[0] === name);
const apiCalls = () =>
  API.get.mock.calls.map(([{ signal, ...params }]) => params);

describe('Captain responses page', () => {
  beforeEach(() => {
    env.state = reactive({
      uiFlags: { fetchingList: false },
      meta: {},
      records: [],
      suggestions: 0,
    });
    env.route = reactive({
      params: { accountId: 1, assistantId: '5' },
      query: {},
    });
    env.router = { push: vi.fn(), replace: vi.fn() };
    env.cloud = true;
    env.calls = [];
    env.api = async () => respond([response(1), response(2)]);
    env.store = {
      dispatch: vi.fn(async (name, payload) => {
        if (name === 'captainResponses/setRecords') {
          env.state.records = payload.records;
          env.state.meta = payload.meta;
        }
        if (name === 'captainResponses/setFetchingList') {
          env.state.uiFlags.fetchingList = payload;
        }
      }),
    };
  });

  it('loads the assistant responses and suggestion count on mount', async () => {
    const wrapper = await mountPage();
    expect(apiCalls()).toEqual([{ page: 1, assistantId: 5 }]);
    expect(env.router.replace).toHaveBeenCalledWith({ query: { page: 1 } });
    expect(dispatched('captainFaqSuggestions/fetchOpenCount')[0][1]).toBe(5);
    expect(cards(wrapper).map(c => c.props('question'))).toEqual(['Q1', 'Q2']);
    expect(wrapper.findComponent(Layout).props()).toMatchObject({
      isEmpty: false,
      isFetching: false,
      showPaginationFooter: true,
      totalCount: 2,
      currentPage: 1,
    });
    expect(
      wrapper
        .findComponent({ name: 'FeatureSpotlightPopover' })
        .props('hideActions')
    ).toBe(false);
    expect(wrapper.find('.banner').exists()).toBe(false);
  });

  it('restores page and search from the URL', async () => {
    env.route.query = { page: '3', search: 'refund' };
    env.route.params.assistantId = undefined;
    env.cloud = false;
    const wrapper = await mountPage();
    expect(apiCalls()).toEqual([{ page: 3, search: 'refund' }]);
    expect(env.router.replace).toHaveBeenCalledWith({
      query: { page: 3, search: 'refund' },
    });
    expect(
      wrapper
        .findComponent({ name: 'FeatureSpotlightPopover' })
        .props('hideActions')
    ).toBe(true);
  });

  it('defaults to page 1 for a bad page in the URL', async () => {
    env.route.query = { page: 'abc' };
    await mountPage();
    expect(apiCalls()[0].page).toBe(1);
  });

  it('alerts when loading fails', async () => {
    env.api = async () => {
      throw new Error('Server down');
    };
    await mountPage();
    expect(useAlert).toHaveBeenCalledWith('Server down');
    expect(env.state.uiFlags.fetchingList).toBe(false);

    env.api = async () => {
      throw {};
    };
    await mountPage();
    expect(useAlert).toHaveBeenLastCalledWith('CAPTAIN.RESPONSES.ERRORS.LOAD');
  });

  it('drops a superseded response and searches on input', async () => {
    // Like axios, the first request rejects once its signal is aborted.
    let aborted;
    env.api = ({ signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true;
          reject(
            Object.assign(new Error('canceled'), { name: 'CanceledError' })
          );
        });
      });
    const wrapper = await mountPage();
    env.api = async () => respond([response(9)]);
    const search = wrapper.findComponent({ name: 'Input' });
    search.vm.$emit('update:modelValue', 'ship');
    search.vm.$emit('input');
    await flushPromises();
    expect(aborted).toBe(true);
    expect(useAlert).not.toHaveBeenCalled();
    expect(apiCalls().at(-1)).toEqual({
      page: 1,
      assistantId: 5,
      search: 'ship',
    });
    expect(cards(wrapper).map(c => c.props('id'))).toEqual([9]);
  });

  it('reloads when the assistant changes', async () => {
    await mountPage();
    env.route.params.assistantId = '6';
    await flushPromises();
    expect(apiCalls().at(-1)).toEqual({ page: 1, assistantId: 6 });
    expect(dispatched('captainResponses/setRecords')[2][1]).toEqual({
      records: [],
      meta: { page: 1, total_count: 0 },
    });
  });

  it('shows the empty state and opens the create dialog', async () => {
    env.api = async () => respond([]);
    const wrapper = await mountPage();
    expect(wrapper.findComponent(Layout).props('isEmpty')).toBe(true);
    wrapper.findComponent({ name: 'ResponsePageEmptyState' }).vm.$emit('click');
    await flushPromises();
    expect(env.calls).toEqual(['CreateResponseDialog-open']);
    const create = wrapper.findComponent({ name: 'CreateResponseDialog' });
    expect(create.props('type')).toBe('create');
    create.vm.$emit('close');
    await flushPromises();
    expect(
      wrapper.findComponent({ name: 'CreateResponseDialog' }).exists()
    ).toBe(false);

    wrapper.findComponent(Layout).vm.$emit('click');
    await flushPromises();
    expect(env.calls).toHaveLength(2);
  });

  it('edits and deletes a response from its card', async () => {
    const wrapper = await mountPage();
    cards(wrapper)[1].vm.$emit('action', { action: 'edit', id: 2 });
    await flushPromises();
    const create = wrapper.findComponent({ name: 'CreateResponseDialog' });
    expect(create.props()).toMatchObject({
      type: 'edit',
      selectedResponse: response(2),
    });
    create.vm.$emit('close');
    await flushPromises();

    cards(wrapper)[0].vm.$emit('action', { action: 'delete', id: 1 });
    await flushPromises();
    expect(env.calls).toContain('DeleteDialog-open');
    expect(
      wrapper.findComponent({ name: 'DeleteDialog' }).props('entity')
    ).toEqual(response(1));

    cards(wrapper)[0].vm.$emit('action', { action: 'other', id: 1 });
    await flushPromises();
    expect(env.calls.filter(c => c === 'DeleteDialog-open')).toHaveLength(1);
  });

  it('goes back a page when the last response on it is deleted', async () => {
    env.api = async () => respond([response(1)], { page: 2, totalCount: 26 });
    const wrapper = await mountPage();
    cards(wrapper)[0].vm.$emit('action', { action: 'delete', id: 1 });
    await flushPromises();
    const deleter = wrapper.findComponent({ name: 'DeleteDialog' });

    deleter.vm.$emit('deleteSuccess');
    expect(API.get).toHaveBeenCalledTimes(1);

    env.state.records = [];
    deleter.vm.$emit('deleteSuccess');
    await flushPromises();
    expect(apiCalls().at(-1).page).toBe(1);
  });

  it('stays on the first page after deleting its last response', async () => {
    env.api = async () => respond([response(1)]);
    const wrapper = await mountPage();
    cards(wrapper)[0].vm.$emit('action', { action: 'delete', id: 1 });
    await flushPromises();
    env.state.records = [];
    wrapper.findComponent({ name: 'DeleteDialog' }).vm.$emit('deleteSuccess');
    expect(API.get).toHaveBeenCalledTimes(1);
  });

  it('opens conversation links and the usage drawer', async () => {
    const wrapper = await mountPage();
    cards(wrapper)[0].vm.$emit('navigate', { id: 77, type: 'Conversation' });
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'inbox_conversation',
      params: { conversation_id: 77 },
    });
    cards(wrapper)[0].vm.$emit('navigate', { id: 3, type: 'Document' });
    expect(env.router.push).toHaveBeenCalledTimes(1);

    const drawer = wrapper.findComponent(Drawer);
    expect(drawer.props()).toMatchObject({
      open: false,
      title: '',
      conversationCount: 0,
    });
    cards(wrapper)[1].vm.$emit('viewConversations', 2);
    await flushPromises();
    expect(drawer.props()).toMatchObject({
      open: true,
      resourceId: 2,
      title: 'Q2',
      conversationCount: 2,
    });
    await drawer.props('fetcher')({ resourceId: 2, page: 3 });
    expect(API.getDrilldown).toHaveBeenCalledWith({ responseId: 2, page: 3 });

    drawer.vm.$emit('close');
    await flushPromises();
    expect(drawer.props('open')).toBe(false);

    cards(wrapper)[1].vm.$emit('viewConversations', 99);
    await flushPromises();
    expect(drawer.props('open')).toBe(false);
  });

  it('closes the usage drawer on page change', async () => {
    const wrapper = await mountPage();
    cards(wrapper)[1].vm.$emit('viewConversations', 2);
    await flushPromises();
    wrapper.findComponent(Layout).vm.$emit('update:currentPage', 2);
    await flushPromises();
    expect(wrapper.findComponent(Drawer).props('open')).toBe(false);
    expect(apiCalls().at(-1).page).toBe(2);
  });

  it('selects cards, labels the bulk bar and clears on page change', async () => {
    const wrapper = await mountPage();
    const bar = () => wrapper.findComponent(Bulk);
    expect(bar().props('selectAllLabel')).toBe(
      'CAPTAIN.RESPONSES.SELECT_ALL:{"count":2}'
    );
    cards(wrapper)[0].vm.$emit('hover', true);
    await flushPromises();
    expect(cards(wrapper).map(c => c.props('selectable'))).toEqual([
      true,
      false,
    ]);
    cards(wrapper)[0].vm.$emit('hover', false);
    await flushPromises();
    expect(cards(wrapper)[0].props('selectable')).toBe(false);

    cards(wrapper)[0].vm.$emit('select', 1);
    cards(wrapper)[1].vm.$emit('select', 2);
    await flushPromises();
    expect(wrapper.find('.search').exists()).toBe(false);
    expect(bar().classes()).toContain('mb-2');
    expect(bar().props('selectAllLabel')).toBe(
      'CAPTAIN.RESPONSES.UNSELECT_ALL:{"count":2}'
    );
    expect(bar().props('selectedCountLabel')).toBe(
      'CAPTAIN.RESPONSES.SELECTED:{"count":2}'
    );
    expect(cards(wrapper).map(c => c.props('showMenu'))).toEqual([
      false,
      false,
    ]);
    cards(wrapper)[1].vm.$emit('select', 2);
    await flushPromises();
    expect(cards(wrapper)[1].props('isSelected')).toBe(false);

    bar().vm.$emit('bulkDelete');
    expect(env.calls).toContain('BulkDeleteDialog-open');

    wrapper.findComponent(Layout).vm.$emit('update:currentPage', 2);
    await flushPromises();
    expect(bar().props('modelValue').size).toBe(0);
    wrapper.findComponent(Layout).vm.$emit('update:currentPage', 1);
    await flushPromises();
    expect(bar().props('modelValue').size).toBe(0);
  });

  it('labels select all for an empty list', async () => {
    env.api = async () => respond([]);
    const wrapper = await mountPage();
    env.state.records = null;
    await flushPromises();
    expect(wrapper.findComponent(Bulk).props('selectAllLabel')).toBe(
      'CAPTAIN.RESPONSES.SELECT_ALL:{"count":0}'
    );
  });

  it.each([
    [[response(1)], 2, 2],
    [[], 3, 2],
    [[], 1, 1],
  ])(
    'refetches after a bulk delete (left %o on page %i)',
    async (left, page, expected) => {
      env.api = async () =>
        respond([response(1), response(2)], { page, totalCount: 60 });
      const wrapper = await mountPage();
      cards(wrapper)[0].vm.$emit('select', 1);
      env.state.records = left;
      await flushPromises();
      wrapper
        .findComponent({ name: 'BulkDeleteDialog' })
        .vm.$emit('deleteSuccess');
      await flushPromises();
      expect(apiCalls().at(-1).page).toBe(expected);
      expect(wrapper.findComponent(Bulk).props('modelValue').size).toBe(0);
    }
  );

  it('falls back to page 1 in the URL when the meta has no page', async () => {
    env.api = async () => respond([response(1)], { page: null, totalCount: 1 });
    const wrapper = await mountPage();
    cards(wrapper)[0].vm.$emit('select', 1);
    await flushPromises();
    wrapper
      .findComponent({ name: 'BulkDeleteDialog' })
      .vm.$emit('deleteSuccess');
    await flushPromises();
    expect(apiCalls().at(-1).page).toBeNull();
    expect(env.router.replace).toHaveBeenLastCalledWith({ query: { page: 1 } });
  });

  it('shows the FAQ suggestions banner and opens suggestions', async () => {
    env.state.suggestions = 3;
    const wrapper = await mountPage();
    wrapper.findComponent({ name: 'Banner' }).vm.$emit('action');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'captain_assistants_faq_suggestions',
      params: { accountId: 1, assistantId: 5 },
    });
  });

  it('stops the loading flag when leaving', async () => {
    const wrapper = await mountPage();
    env.store.dispatch.mockClear();
    wrapper.unmount();
    expect(dispatched('captainResponses/setFetchingList')).toEqual([
      ['captainResponses/setFetchingList', false],
    ]);
  });
});
