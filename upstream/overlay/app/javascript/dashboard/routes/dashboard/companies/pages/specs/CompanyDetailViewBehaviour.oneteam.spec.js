/**
 * OneTeam behaviour spec for the company detail page.
 *
 * The companies store, paywall, route and router are faked. Covers
 * loading and empty states, the paywall, tab switching with search and
 * filters kept in the URL, paging conversations and notes, adding or
 * reassigning contacts, editing, deleting, and navigating back.
 */
import { nextTick, reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CompanyDetailView from '../CompanyDetailView.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('pinia', async importOriginal => {
  const { toRefs } = await import('vue');
  return { ...(await importOriginal()), storeToRefs: store => toRefs(store) };
});
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useDebounceFn: fn => fn,
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useCompaniesPaywall', () => ({
  useCompaniesPaywall: () => env.paywall,
}));
vi.mock('dashboard/stores/companies', () => ({
  useCompaniesStore: () => env.store,
}));

const named = (name, props = [], emits = [], extra = {}) => ({
  name,
  props,
  emits,
  template: `<div class="${name}"><slot /></div>`,
  ...extra,
});

const Layout = {
  name: 'DetailsPageLayout',
  props: ['isLoading', 'tabs', 'activeTab', 'backLabel'],
  emits: ['update:activeTab', 'back'],
  methods: { scrollToTabs: () => env.scrollToTabs() },
  template: `<div>
    <div v-if="isLoading" class="loading" />
    <slot v-else-if="$slots.state" name="state" />
    <template v-else>
      <slot name="header" /><slot name="actions" /><slot />
    </template>
  </div>`,
};
const Header = named(
  'CompanyDetailHeader',
  ['company', 'openConversationsCount'],
  ['edit', 'delete', 'showOpenConversations']
);
const Filters = named(
  'CompanyConversationFilters',
  ['modelValue'],
  ['update:modelValue']
);
const Search = named(
  'CompanySearchInput',
  ['modelValue', 'placeholder'],
  ['update:modelValue']
);
const NextButton = named('NextButton', ['label'], ['click']);
const ConversationList = named(
  'CompanyConversationList',
  ['conversations', 'filtered', 'isLoading', 'hasMore'],
  ['loadMore']
);
const NotesFeed = named(
  'CompanyNotesFeed',
  ['notes', 'hasMore', 'emptyMessage', 'highlight'],
  ['loadMore']
);
const PeopleList = named('CompanyPeopleList', ['company', 'query']);
const EditPanel = named('CompanyEditPanel', ['company'], [], {
  methods: { open: () => env.editOpen() },
});
const PeopleDialog = named('Dialog', ['title'], [], {
  methods: { open: () => env.peopleOpen() },
});
const AddContact = named(
  'CompanyAddContact',
  ['selectedContact', 'isBusy'],
  [
    'cancelContactSelection',
    'confirmContactSelection',
    'search',
    'selectContact',
  ]
);
const DeleteDialog = named(
  'ConfirmCompanyDeleteDialog',
  ['isLoading'],
  ['confirm'],
  {
    data: () => ({ dialogRef: env.deleteDialog }),
  }
);

const mountPage = async () => {
  const wrapper = mount(CompanyDetailView, {
    global: {
      stubs: {
        DetailsPageLayout: Layout,
        Paywall: { template: '<div class="paywall" />' },
        CompanyDetailHeader: Header,
        CompanyFacts: true,
        CompanyConversationFilters: Filters,
        CompanySearchInput: Search,
        Button: NextButton,
        CompanyConversationList: ConversationList,
        CompanyNotesFeed: NotesFeed,
        CompanyPeopleList: PeopleList,
        CompanyEditPanel: EditPanel,
        Dialog: PeopleDialog,
        CompanyAddContact: AddContact,
        ConfirmCompanyDeleteDialog: DeleteDialog,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const layout = wrapper => wrapper.findComponent(Layout);
const openFilter = expect.objectContaining({ attributeKey: 'status' });

describe('CompanyDetailView behaviour', () => {
  beforeEach(() => {
    env.route = reactive({
      params: { accountId: 1, companyId: '5' },
      query: {},
    });
    env.router = {
      replace: vi.fn(({ query }) => {
        env.route.query = query;
      }),
      push: vi.fn(),
      back: vi.fn(),
    };
    env.paywall = { isReady: ref(true), showPaywall: ref(false) };
    env.company = { id: 5, name: 'Acme', contactsCount: 4 };
    env.scrollToTabs = vi.fn();
    env.editOpen = vi.fn();
    env.peopleOpen = vi.fn();
    env.deleteDialog = { open: vi.fn(), close: vi.fn() };
    env.store = reactive({
      companyConversations: [{ id: 1 }],
      companyNotes: [{ id: 2 }],
      companyConversationsMeta: { totalCount: 3, allCount: 3, openCount: 1 },
      companyNotesMeta: { totalCount: 1 },
      contactSearchResults: [],
      uiFlags: {},
      getRecord: vi.fn(() => env.company),
      resetCompanyDetailState: vi.fn(),
      show: vi.fn(),
      getCompanyConversations: vi.fn(),
      getCompanyNotes: vi.fn(),
      getCompanyContacts: vi.fn(),
      searchCompanyContactCandidates: vi.fn(),
      attachContactToCompany: vi.fn(),
      delete: vi.fn(),
    });
  });

  afterEach(() => {
    window.history.replaceState(null, '');
  });

  it('loads the company, conversations and notes', async () => {
    const wrapper = await mountPage();
    expect(env.store.resetCompanyDetailState).toHaveBeenCalled();
    expect(env.store.show).toHaveBeenCalledWith(5);
    expect(env.store.getCompanyConversations).toHaveBeenCalledWith(5, 1, []);
    expect(env.store.getCompanyNotes).toHaveBeenCalledWith(5, 1, undefined);
    expect(layout(wrapper).props('activeTab')).toBe('conversations');
    expect(
      layout(wrapper)
        .props('tabs')
        .map(tab => tab.count)
    ).toEqual([3, 1, 4]);
    expect(wrapper.findComponent(Header).props('openConversationsCount')).toBe(
      1
    );
    expect(wrapper.findComponent(ConversationList).props()).toMatchObject({
      filtered: false,
      hasMore: true,
    });

    await wrapper.findComponent(ConversationList).vm.$emit('loadMore');
    expect(env.store.getCompanyConversations).toHaveBeenLastCalledWith(
      5,
      2,
      []
    );
    env.store.companyConversationsMeta = { page: 2 };
    await nextTick();
    expect(wrapper.findComponent(ConversationList).props('hasMore')).toBe(
      false
    );
    await wrapper.findComponent(ConversationList).vm.$emit('loadMore');
    expect(env.store.getCompanyConversations).toHaveBeenLastCalledWith(
      5,
      3,
      []
    );

    wrapper.unmount();
    expect(env.store.resetCompanyDetailState).toHaveBeenCalledTimes(2);
  });

  it('shows the loading, paywall and empty states', async () => {
    env.paywall.isReady.value = false;
    let wrapper = await mountPage();
    expect(wrapper.find('.loading').exists()).toBe(true);
    expect(env.store.show).not.toHaveBeenCalled();

    env.paywall.isReady.value = true;
    env.paywall.showPaywall.value = true;
    wrapper = await mountPage();
    expect(wrapper.find('.paywall').exists()).toBe(true);
    expect(env.store.show).not.toHaveBeenCalled();

    env.paywall.showPaywall.value = false;
    env.company = undefined;
    env.store.uiFlags = { fetchingItem: true };
    wrapper = await mountPage();
    expect(wrapper.find('.loading').exists()).toBe(true);
    env.store.uiFlags = { fetchingContacts: true };
    await nextTick();
    expect(wrapper.find('.loading').exists()).toBe(true);
    env.store.uiFlags = {};
    await nextTick();
    expect(wrapper.text()).toContain('COMPANIES.DETAIL.EMPTY_STATE.TITLE');
  });

  it('skips loading without a company id', async () => {
    env.route.params.companyId = undefined;
    env.company = undefined;
    await mountPage();
    expect(env.store.show).not.toHaveBeenCalled();
  });

  it('applies conversation filters from the URL and the header shortcut', async () => {
    env.route.query = {
      tab: 'conversations',
      filters: '[{"attributeKey":"x"}]',
    };
    const wrapper = await mountPage();
    expect(wrapper.findComponent(Filters).props('modelValue')).toEqual([
      { attributeKey: 'x' },
    ]);
    expect(wrapper.findComponent(ConversationList).props('filtered')).toBe(
      true
    );

    await wrapper.findComponent(Header).vm.$emit('showOpenConversations');
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: {
        tab: 'conversations',
        filters: expect.stringContaining('equal_to'),
      },
    });
    expect(env.store.getCompanyConversations).toHaveBeenLastCalledWith(5, 1, [
      openFilter,
    ]);
    expect(env.scrollToTabs).toHaveBeenCalled();

    await wrapper.findComponent(Filters).vm.$emit('update:modelValue', []);
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: { tab: 'conversations', filters: undefined },
    });
  });

  it('ignores broken filters in the URL', async () => {
    env.route.query = { filters: '{oops' };
    const wrapper = await mountPage();
    expect(wrapper.findComponent(Filters).props('modelValue')).toEqual([]);
  });

  it('switches tabs, keeping searches and dropping filters', async () => {
    env.route.query = { filters: '[{"attributeKey":"x"}]' };
    const wrapper = await mountPage();
    await layout(wrapper).vm.$emit('update:activeTab', 'conversations');
    expect(env.router.replace).not.toHaveBeenCalled();

    await layout(wrapper).vm.$emit('update:activeTab', 'notes');
    expect(env.store.getCompanyConversations).toHaveBeenLastCalledWith(5);
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: { tab: 'notes', q: undefined },
    });
    await nextTick();
    expect(wrapper.findComponent(NotesFeed).props()).toMatchObject({
      hasMore: false,
      emptyMessage: 'COMPANIES.DETAIL.ACTIVITY.EMPTY_NOTES',
      highlight: '',
    });

    await layout(wrapper).vm.$emit('update:activeTab', 'people');
    await nextTick();
    expect(wrapper.findComponent(PeopleList).exists()).toBe(true);
    await wrapper.findComponent(Search).vm.$emit('update:modelValue', ' jane ');
    await layout(wrapper).vm.$emit('update:activeTab', 'conversations');
    await layout(wrapper).vm.$emit('update:activeTab', 'people');
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: { tab: 'people', q: 'jane' },
    });
    expect(env.store.getCompanyConversations).toHaveBeenCalledTimes(2);
  });

  it('searches and pages notes', async () => {
    env.route.query = { tab: 'notes', q: 'renewal' };
    env.store.companyNotesMeta = { totalCount: 5, page: 1 };
    const wrapper = await mountPage();
    expect(env.store.getCompanyNotes).toHaveBeenCalledWith(5, 1, 'renewal');
    expect(wrapper.findComponent(NotesFeed).props()).toMatchObject({
      hasMore: true,
      emptyMessage: 'COMPANIES.DETAIL.ACTIVITY.NO_MATCHING_NOTES',
      highlight: 'renewal',
    });
    await wrapper.findComponent(NotesFeed).vm.$emit('loadMore');
    expect(env.store.getCompanyNotes).toHaveBeenLastCalledWith(5, 2, 'renewal');

    await wrapper.findComponent(Search).vm.$emit('update:modelValue', ' ');
    await flushPromises();
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: { tab: 'notes', q: undefined },
    });
    expect(env.store.getCompanyNotes).toHaveBeenLastCalledWith(5, 1, undefined);
    env.store.companyNotesMeta = {};
    await nextTick();
    await wrapper.findComponent(NotesFeed).vm.$emit('loadMore');
    expect(env.store.getCompanyNotes).toHaveBeenLastCalledWith(5, 2, undefined);
  });

  it('starts empty searches for tabs without a query', async () => {
    env.route.query = { tab: 'people' };
    let wrapper = await mountPage();
    expect(wrapper.findComponent(Search).props('modelValue')).toBe('');
    env.route.query = { tab: 'notes' };
    wrapper = await mountPage();
    expect(wrapper.findComponent(Search).props('modelValue')).toBe('');
  });

  it('adds and reassigns contacts from the people tab', async () => {
    env.route.query = { tab: 'people', q: 'jo' };
    const wrapper = await mountPage();
    expect(wrapper.findComponent(PeopleDialog).props('title')).toBe(
      'COMPANIES.DETAIL.PEOPLE.DIALOG_TITLE'
    );
    await wrapper.findComponent(NextButton).vm.$emit('click');
    expect(env.peopleOpen).toHaveBeenCalled();

    const add = wrapper.findComponent(AddContact);
    await add.vm.$emit('search', 'jo');
    expect(env.store.searchCompanyContactCandidates).toHaveBeenCalledWith({
      companyId: 5,
      search: 'jo',
    });

    await add.vm.$emit('confirmContactSelection');
    expect(env.store.attachContactToCompany).not.toHaveBeenCalled();

    await add.vm.$emit('selectContact', { id: 8 });
    expect(add.props('selectedContact')).toEqual({ id: 8 });
    await add.vm.$emit('confirmContactSelection');
    await flushPromises();
    expect(env.store.attachContactToCompany).toHaveBeenCalledWith(5, 8);
    expect(env.store.getCompanyContacts).toHaveBeenCalledWith(5, 1, 'jo');
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.CONTACTS.MESSAGES.ADD_SUCCESS'
    );
    expect(add.props('selectedContact')).toBeNull();

    await add.vm.$emit('selectContact', { id: 9, company: { id: 6 } });
    env.store.attachContactToCompany.mockRejectedValueOnce(new Error('no'));
    await add.vm.$emit('confirmContactSelection');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.CONTACTS.MESSAGES.REASSIGN_ERROR'
    );

    await wrapper.findComponent(Search).vm.$emit('update:modelValue', '');
    await add.vm.$emit('confirmContactSelection');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.CONTACTS.MESSAGES.REASSIGN_SUCCESS'
    );
    expect(env.store.getCompanyContacts).toHaveBeenCalledTimes(1);

    await add.vm.$emit('selectContact', { id: 10, company: { id: 5 } });
    env.store.attachContactToCompany.mockRejectedValueOnce(new Error('no'));
    await add.vm.$emit('confirmContactSelection');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.CONTACTS.MESSAGES.ADD_ERROR'
    );

    await add.vm.$emit('cancelContactSelection');
    expect(add.props('selectedContact')).toBeNull();
  });

  it('edits and deletes the company', async () => {
    const wrapper = await mountPage();
    await wrapper.findComponent(Header).vm.$emit('edit');
    expect(env.editOpen).toHaveBeenCalled();
    await wrapper.findComponent(Header).vm.$emit('delete');
    expect(env.deleteDialog.open).toHaveBeenCalled();

    env.store.delete.mockRejectedValueOnce(new Error('no'));
    await wrapper.findComponent(DeleteDialog).vm.$emit('confirm');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.DELETE.MESSAGES.ERROR'
    );

    await wrapper.findComponent(DeleteDialog).vm.$emit('confirm');
    await flushPromises();
    expect(env.store.delete).toHaveBeenCalledWith(5);
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.DETAIL.DELETE.MESSAGES.SUCCESS'
    );
    expect(env.deleteDialog.close).toHaveBeenCalled();
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'companies_dashboard_index',
      params: { accountId: 1 },
      query: { page: '1' },
    });
  });

  it('goes back through history when possible', async () => {
    const wrapper = await mountPage();
    await layout(wrapper).vm.$emit('back');
    expect(env.router.push).toHaveBeenCalled();
    window.history.replaceState({ back: '/companies' }, '');
    await layout(wrapper).vm.$emit('back');
    expect(env.router.back).toHaveBeenCalled();
  });
});
