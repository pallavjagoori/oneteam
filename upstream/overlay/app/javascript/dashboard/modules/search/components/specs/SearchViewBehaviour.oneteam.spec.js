/**
 * OneTeam behaviour spec for the full search page.
 *
 * Covers restoring a search from the URL once the account is loaded,
 * advanced-search filters in the request, tabs (permissions, feature flags
 * and counts), the "all" tab preview with "view more", empty states,
 * paginated "load more" with rollback on failure, back navigation and
 * clearing results on unmount.
 */
import { reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import SearchView from '../SearchView.vue';

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
vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ currentAccount: env.account }),
}));
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({
    shouldShow: (flag, permissions) =>
      !env.hiddenPermissions.some(p => permissions.includes(p)),
    isFeatureFlagEnabled: flag => !flag || env.flags.includes(flag),
  }),
}));
vi.mock('../../helpers/searchHelper', () => ({
  parseURLParams: (query, advanced) => env.parse(query, advanced),
  generateURLParams: (filters, advanced) =>
    advanced && filters.from ? { from: filters.from } : {},
}));
vi.mock('dashboard/composables/store.js', async () => {
  const { computed } = await import('vue');
  const getters = {
    'conversationSearch/getContactRecords': () => env.state.contacts,
    'conversationSearch/getConversationRecords': () => env.state.conversations,
    'conversationSearch/getMessageRecords': () => env.state.messages,
    'conversationSearch/getArticleRecords': () => env.state.articles,
    'conversationSearch/getUIFlags': () => env.state.uiFlags,
  };
  return {
    useMapGetter: key => computed(getters[key]),
    useStore: () => env.store,
  };
});

const { useTrack } = await import('dashboard/composables');

const flags = () => ({
  isFetching: false,
  isSearchCompleted: false,
  contact: { isFetching: false, hasMore: false },
  conversation: { isFetching: false, hasMore: false },
  message: { isFetching: false, hasMore: false },
  article: { isFetching: false, hasMore: false },
});
const many = (n, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, ...extra }));

const list = name => ({
  name,
  props: [
    'isFetching',
    'contacts',
    'conversations',
    'messages',
    'articles',
    'query',
    'showTitle',
  ],
  template: `<div class="${name}" />`,
});
const ButtonStub = {
  name: 'NextButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};
const Header = {
  name: 'SearchHeader',
  props: ['filters', 'initialQuery'],
  emits: ['search', 'filterChange', 'update:filters'],
  template: '<div />',
};
const Tabs = {
  name: 'SearchTabs',
  props: ['tabs', 'selectedTab'],
  emits: ['tabChange'],
  template: '<div />',
};

const mountView = () =>
  mount(SearchView, {
    global: {
      stubs: {
        NextButton: ButtonStub,
        SearchHeader: Header,
        SearchTabs: Tabs,
        SearchResultContactsList: list('SearchResultContactsList'),
        SearchResultConversationsList: list('SearchResultConversationsList'),
        SearchResultMessagesList: list('SearchResultMessagesList'),
        SearchResultArticlesList: list('SearchResultArticlesList'),
        Policy: {
          name: 'Policy',
          props: ['permissions', 'featureFlag'],
          template: '<div class="policy"><slot /></div>',
        },
        FluentIcon: { template: '<i />' },
      },
    },
  });

const header = wrapper => wrapper.findComponent(Header);
const tabs = wrapper => wrapper.findComponent(Tabs);
const search = async (wrapper, q) => {
  header(wrapper).vm.$emit('search', q);
  await flushPromises();
};
const dispatched = action =>
  env.store.dispatch.mock.calls.filter(([name]) => name === action);
const button = (wrapper, icon) => wrapper.find(`[data-icon="${icon}"]`);

describe('SearchView behaviour', () => {
  beforeEach(() => {
    env.route = reactive({ params: { accountId: 1 }, query: {} });
    env.router = { replace: vi.fn(), push: vi.fn(), go: vi.fn() };
    env.store = { dispatch: vi.fn(async () => true) };
    env.account = ref({ id: 1 });
    env.hiddenPermissions = [];
    env.flags = ['help_center'];
    env.parse = vi.fn(() => ({
      from: null,
      in: null,
      dateRange: { type: null, from: null, to: null },
    }));
    env.state = reactive({
      contacts: [],
      conversations: [],
      messages: [],
      articles: [],
      uiFlags: flags(),
    });
  });

  it('clears results, loads agents and shows the default empty state', () => {
    const wrapper = mountView();
    expect(dispatched('conversationSearch/clearSearchResults')).toHaveLength(1);
    expect(dispatched('agents/get')).toHaveLength(1);
    expect(env.parse).toHaveBeenCalledWith({}, false);
    expect(tabs(wrapper).exists()).toBe(false);
    expect(wrapper.text()).toContain('SEARCH.EMPTY_STATE_DEFAULT');
  });

  it('waits for the account before restoring a search from the URL', async () => {
    env.account.value = null;
    env.route.query = { q: 'refund' };
    env.flags.push('advanced_search');
    env.parse.mockReturnValue({
      from: 'contact:3',
      in: 7,
      dateRange: { type: 'custom', from: 100, to: 200 },
    });
    const wrapper = mountView();
    expect(dispatched('conversationSearch/fullSearch')).toHaveLength(0);
    expect(header(wrapper).props('initialQuery')).toBe('refund');

    env.account.value = { id: 1 };
    await flushPromises();
    expect(env.parse).toHaveBeenCalledWith({ q: 'refund' }, true);
    expect(useTrack).toHaveBeenCalledWith('Searched conversations');
    expect(dispatched('conversationSearch/fullSearch')[0][1]).toEqual({
      q: 'refund',
      page: 1,
      since: 100,
      until: 200,
      from: 'contact:3',
      inboxId: 7,
    });
    expect(env.router.replace).toHaveBeenLastCalledWith({
      name: 'search',
      params: { accountId: 1 },
      query: { q: 'refund', from: 'contact:3' },
    });
  });

  it('restores filters without searching when the URL has no query', () => {
    mountView();
    expect(env.parse).toHaveBeenCalled();
    expect(dispatched('conversationSearch/fullSearch')).toHaveLength(0);
  });

  it('drops filters from the request without advanced search', async () => {
    const wrapper = mountView();
    header(wrapper).vm.$emit('update:filters', {
      from: 'agent:2',
      in: 4,
      dateRange: { type: 'custom', from: 1, to: 2 },
    });
    await search(wrapper, ' hello ');
    expect(dispatched('conversationSearch/fullSearch')[0][1]).toEqual({
      q: ' hello ',
      page: 1,
    });
    expect(env.router.replace.mock.lastCall[0].query).toEqual({ q: 'hello' });
  });

  it('applies only date filters when they are partly set', async () => {
    env.flags.push('advanced_search');
    const wrapper = mountView();
    header(wrapper).vm.$emit('update:filters', {
      from: null,
      in: null,
      dateRange: { type: 'custom', from: null, to: 9 },
    });
    await search(wrapper, 'hi');
    expect(dispatched('conversationSearch/fullSearch')[0][1]).toEqual({
      q: 'hi',
      page: 1,
      until: 9,
    });
    header(wrapper).vm.$emit('filterChange');
    await flushPromises();
    expect(dispatched('conversationSearch/fullSearch')).toHaveLength(2);
  });

  it('clearing the query resets results without searching', async () => {
    const wrapper = mountView();
    await search(wrapper, '');
    expect(dispatched('conversationSearch/fullSearch')).toHaveLength(0);
    expect(dispatched('conversationSearch/clearSearchResults')).toHaveLength(2);
    expect(env.router.replace.mock.lastCall[0].query).toEqual({});
  });

  it('lists the tabs the user may see, with counts', async () => {
    env.state.contacts = many(2);
    env.state.messages = many(3);
    env.state.articles = many(1);
    const wrapper = mountView();
    await search(wrapper, 'x');
    expect(
      tabs(wrapper)
        .props('tabs')
        .map(t => [t.key, t.count, t.showBadge])
    ).toEqual([
      ['all', null, false],
      ['contacts', 2, true],
      ['conversations', 0, true],
      ['messages', 3, true],
      ['articles', 1, true],
    ]);
    expect(tabs(wrapper).props('selectedTab')).toBe(0);
  });

  it('hides tabs without permission or with the help center off', async () => {
    env.hiddenPermissions = ['contact_manage', 'administrator', 'agent'];
    env.flags = [];
    env.state.uiFlags.isFetching = true;
    const wrapper = mountView();
    await search(wrapper, 'x');
    expect(
      tabs(wrapper)
        .props('tabs')
        .map(t => t.key)
    ).not.toContain('contacts');
    expect(
      tabs(wrapper)
        .props('tabs')
        .map(t => t.key)
    ).not.toContain('articles');
    expect(wrapper.find('.policy').exists()).toBe(true);
    expect(
      wrapper.findComponent({ name: 'SearchResultArticlesList' }).exists()
    ).toBe(false);
  });

  it('previews five of each on the all tab and offers view more', async () => {
    env.route.query = { q: 'x' };
    env.state.contacts = many(6);
    env.state.conversations = many(6, { meta: { sender_name: 'A' } });
    env.state.messages = many(6);
    env.state.articles = many(6);
    env.state.uiFlags.isSearchCompleted = true;
    const wrapper = mountView();
    await flushPromises();

    const contacts = wrapper.findComponent({
      name: 'SearchResultContactsList',
    });
    expect(contacts.props('contacts')).toHaveLength(5);
    expect(contacts.props('contacts')[0]).toEqual({ id: 1, type: 'contact' });
    expect(contacts.props('showTitle')).toBe(true);
    const conversation = wrapper
      .findComponent({
        name: 'SearchResultConversationsList',
      })
      .props('conversations')[0];
    expect(conversation).toEqual({
      id: 1,
      meta: { senderName: 'A' },
      type: 'conversation',
    });
    expect(
      wrapper.findComponent({ name: 'SearchResultMessagesList' }).classes()
    ).toContain('mt-4');

    const viewMore = wrapper.findAll('[data-icon="i-lucide-eye"]');
    expect(viewMore).toHaveLength(4);
    const expected = ['contacts', 'messages', 'conversations', 'articles'];
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await wrapper.findAll('[data-icon="i-lucide-eye"]')[i].trigger('click');
      const tabKeys = tabs(wrapper)
        .props('tabs')
        .map(t => t.key);
      expect(tabKeys[tabs(wrapper).props('selectedTab')]).toBe(expected[i]);
      env.route.params.tab = undefined;
      tabs(wrapper).vm.$emit('tabChange', 'all');
      // eslint-disable-next-line no-await-in-loop
      await flushPromises();
    }
  });

  it('shows the empty results message on the all tab', async () => {
    env.state.uiFlags.isSearchCompleted = true;
    const wrapper = mountView();
    await search(wrapper, 'nothing');
    expect(wrapper.text()).toContain(
      'SEARCH.EMPTY_STATE_FULL:{"query":"nothing"}'
    );
    expect(wrapper.find('.policy').exists()).toBe(false);
  });

  it('shows the results section while fetching', async () => {
    env.state.uiFlags.isFetching = true;
    const wrapper = mountView();
    await search(wrapper, 'x');
    expect(wrapper.find('.policy').exists()).toBe(true);
    expect(button(wrapper, 'i-lucide-cloud-download').exists()).toBe(false);
  });

  it.each([
    [
      'contacts',
      'contact',
      'conversationSearch/contactSearch',
      'SearchResultContactsList',
    ],
    [
      'conversations',
      'conversation',
      'conversationSearch/conversationSearch',
      'SearchResultConversationsList',
    ],
    [
      'messages',
      'message',
      'conversationSearch/messageSearch',
      'SearchResultMessagesList',
    ],
    [
      'articles',
      'article',
      'conversationSearch/articleSearch',
      'SearchResultArticlesList',
    ],
  ])(
    'loads more %s page by page and rolls back on failure',
    async (tab, flag, action, listName) => {
      env.flags.push('advanced_search');
      env.route.params.tab = tab;
      env.state[tab] = many(7);
      env.state.uiFlags[flag].hasMore = true;
      const wrapper = mountView();
      header(wrapper).vm.$emit('update:filters', {
        from: 'agent:1',
        in: 2,
        dateRange: { type: null, from: 5, to: null },
      });
      await search(wrapper, 'x');
      expect(wrapper.findComponent({ name: listName }).props()).toMatchObject({
        showTitle: false,
      });
      expect(wrapper.findComponent({ name: listName }).classes()).not.toContain(
        'mt-4'
      );
      expect(wrapper.findAll('[data-icon="i-lucide-eye"]')).toHaveLength(0);
      expect(env.router.replace.mock.lastCall[0].params).toEqual({
        accountId: 1,
        tab,
      });

      await button(wrapper, 'i-lucide-cloud-download').trigger('click');
      await flushPromises();
      // Even for messages, the sender and inbox filters are dropped here:
      // loadMore passes 'messages' but the payload builder checks 'message'
      // (see FINDINGS.md). Only the date filters survive.
      expect(dispatched(action)[0][1]).toEqual({ q: 'x', page: 2, since: 5 });

      env.store.dispatch.mockResolvedValueOnce(false);
      await button(wrapper, 'i-lucide-cloud-download').trigger('click');
      await flushPromises();
      expect(dispatched(action)[1][1].page).toBe(3);
      await button(wrapper, 'i-lucide-cloud-download').trigger('click');
      await flushPromises();
      expect(dispatched(action)[2][1].page).toBe(3);
    }
  );

  it('hides load more without more pages, records or a query', async () => {
    env.route.params.tab = 'contacts';
    env.state.contacts = many(2);
    const wrapper = mountView();
    await search(wrapper, 'x');
    expect(button(wrapper, 'i-lucide-cloud-download').exists()).toBe(false);
    expect(wrapper.find('.policy').exists()).toBe(true);

    env.state.uiFlags.contact.hasMore = true;
    env.state.contacts = [];
    await flushPromises();
    expect(button(wrapper, 'i-lucide-cloud-download').exists()).toBe(false);
  });

  it('does not load more while a search is running', async () => {
    env.route.params.tab = 'contacts';
    env.state.contacts = many(2);
    env.state.uiFlags.contact.hasMore = true;
    const wrapper = mountView();
    await search(wrapper, 'x');
    const loadMore = button(wrapper, 'i-lucide-cloud-download');
    env.state.uiFlags.isFetching = true;
    await loadMore.trigger('click');
    expect(dispatched('conversationSearch/contactSearch')).toHaveLength(0);
  });

  it('switches tabs into the URL and falls back to the first tab index', async () => {
    env.route.params.tab = 'unknown';
    const wrapper = mountView();
    await search(wrapper, 'x');
    expect(tabs(wrapper).props('selectedTab')).toBe(0);
    tabs(wrapper).vm.$emit('tabChange', 'messages');
    await flushPromises();
    expect(env.router.replace.mock.lastCall[0].params.tab).toBe('messages');
    expect(tabs(wrapper).props('selectedTab')).toBe(3);
  });

  it.each([
    [5, 'go'],
    [1, 'push'],
  ])('goes back with history length %i', async (length, method) => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(length);
    const wrapper = mountView();
    await button(wrapper, 'i-lucide-chevron-left').trigger('click');
    if (method === 'go') expect(env.router.go).toHaveBeenCalledWith(-1);
    else expect(env.router.push).toHaveBeenCalledWith({ name: 'home' });
    expect(dispatched('conversationSearch/clearSearchResults')).toHaveLength(2);
  });

  it('clears results when leaving the page', () => {
    const wrapper = mountView();
    wrapper.unmount();
    expect(dispatched('conversationSearch/clearSearchResults')).toHaveLength(2);
  });
});
