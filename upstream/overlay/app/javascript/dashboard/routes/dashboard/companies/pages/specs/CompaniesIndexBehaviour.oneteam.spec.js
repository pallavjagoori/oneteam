/**
 * OneTeam behaviour spec for the companies list page.
 *
 * Covers the paywall, loading once the plan check is ready (list or
 * search, saved sort pushed into the URL), loading and empty states,
 * company cards, searching, paging and sorting (saved to UI settings),
 * opening a company, and creating one (success and failure).
 */
import { reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CompaniesIndex from '../CompaniesIndex.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  debounce: fn => fn,
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    updateUISettings: env.updateUISettings,
    uiSettings: env.uiSettings,
  }),
}));
vi.mock('dashboard/stores/companies', () => ({
  useCompaniesStore: () => env.store,
}));
vi.mock('dashboard/composables/useCompaniesPaywall', () => ({
  useCompaniesPaywall: () => ({
    isReady: env.isReady,
    showPaywall: env.showPaywall,
  }),
}));

const Layout = {
  name: 'CompaniesListLayout',
  props: [
    'searchValue',
    'currentPage',
    'totalItems',
    'activeSort',
    'activeOrdering',
    'isFetchingList',
    'showPaginationFooter',
  ],
  emits: ['update:currentPage', 'update:sort', 'search', 'create'],
  template: '<div><slot /></div>',
};
const Card = {
  name: 'CompaniesCard',
  props: ['id', 'name', 'contactsCount'],
  emits: ['showCompany'],
  template: '<div class="card" />',
};
const Dialog = {
  name: 'CompanyCreateDialog',
  props: ['isLoading'],
  emits: ['create'],
  methods: {
    open: () => env.dialog.open(),
    onSuccess: () => env.dialog.onSuccess(),
  },
  template: '<div />',
};

const mountPage = async ({
  query = {},
  sortBy,
  ready = true,
  paywall = false,
  list = [
    { id: 1, name: 'Acme', contactsCount: 2 },
    { id: 2, name: 'Bee' },
  ],
  meta = { totalCount: 2 },
} = {}) => {
  env.route = reactive({ query, params: { accountId: 3 } });
  env.router = { replace: vi.fn(), push: vi.fn() };
  env.updateUISettings = vi.fn().mockResolvedValue();
  env.uiSettings = ref(sortBy === null ? null : { companies_sort_by: sortBy });
  env.isReady = ref(ready);
  env.showPaywall = ref(paywall);
  env.dialog = { open: vi.fn(), onSuccess: vi.fn() };
  env.store = reactive({
    getCompaniesList: list,
    getMeta: meta,
    getUIFlags: { fetchingList: false, creatingItem: false },
    get: vi.fn().mockResolvedValue(),
    search: vi.fn().mockResolvedValue(),
    create: vi.fn().mockResolvedValue({ id: 9 }),
  });
  const wrapper = mount(CompaniesIndex, {
    global: {
      stubs: {
        CompaniesListLayout: Layout,
        CompaniesCard: Card,
        CompanyCreateDialog: Dialog,
        Paywall: { template: '<div class="paywall" />' },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const layout = wrapper => wrapper.findComponent(Layout);

describe('Companies index behaviour', () => {
  it('shows the paywall without loading', async () => {
    const wrapper = await mountPage({ paywall: true });
    expect(wrapper.find('.paywall').exists()).toBe(true);
    expect(env.store.get).not.toHaveBeenCalled();
  });

  it('waits for the plan check, then lists companies', async () => {
    const wrapper = await mountPage({ ready: false, sortBy: null });
    expect(wrapper.text()).toContain('COMPANIES.LOADING');
    expect(env.store.get).not.toHaveBeenCalled();
    env.isReady.value = true;
    await flushPromises();
    expect(env.store.get).toHaveBeenCalledWith({ page: 1, sort: 'name' });
    expect(env.router.replace).not.toHaveBeenCalled();
    expect(
      wrapper.findAllComponents(Card).map(c => c.props('contactsCount'))
    ).toEqual([2, 0]);
    expect(layout(wrapper).props()).toMatchObject({
      totalItems: 2,
      showPaginationFooter: true,
      activeSort: 'name',
      activeOrdering: '',
    });
  });

  it('restores search, page and a saved descending sort', async () => {
    const wrapper = await mountPage({
      query: { search: 'ac', page: '2' },
      sortBy: '-created_at',
    });
    expect(env.router.replace).toHaveBeenCalledWith({
      query: { search: 'ac', page: '2', sort: '-created_at' },
    });
    expect(env.store.search).toHaveBeenCalledWith({
      search: 'ac',
      page: 2,
      sort: '-created_at',
    });
    expect(layout(wrapper).props()).toMatchObject({
      searchValue: 'ac',
      currentPage: 2,
      activeSort: 'created_at',
      activeOrdering: '-',
    });
  });

  it('keeps a sort already in the URL and falls back for empty settings', async () => {
    await mountPage({ query: { sort: '-name' }, sortBy: '-name' });
    expect(env.router.replace).not.toHaveBeenCalled();
    const wrapper = await mountPage({ sortBy: '' });
    expect(layout(wrapper).props('activeSort')).toBe('name');
  });

  it('shows loading and empty states', async () => {
    const wrapper = await mountPage({ list: [], meta: {} });
    expect(wrapper.text()).toContain('COMPANIES.EMPTY_STATE.TITLE');
    expect(layout(wrapper).props()).toMatchObject({
      totalItems: 0,
      showPaginationFooter: false,
    });
    env.store.getUIFlags = { fetchingList: true };
    await flushPromises();
    expect(wrapper.text()).toContain('COMPANIES.LOADING');
  });

  it('searches, pages and sorts', async () => {
    const wrapper = await mountPage();
    layout(wrapper).vm.$emit('search', 'bee');
    await flushPromises();
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: { page: '1', search: 'bee', sort: 'name' },
    });
    expect(env.store.search).toHaveBeenLastCalledWith({
      search: 'bee',
      page: 1,
      sort: 'name',
    });

    layout(wrapper).vm.$emit('search', '');
    env.route.query = { search: 'old', sort: 'x' };
    layout(wrapper).vm.$emit('update:currentPage', 3);
    await flushPromises();
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: { page: '3', sort: 'name' },
    });
    expect(env.store.get).toHaveBeenLastCalledWith({ page: 3, sort: 'name' });

    layout(wrapper).vm.$emit('update:sort', { sort: 'domain', order: '-' });
    await flushPromises();
    expect(env.updateUISettings).toHaveBeenCalledWith({
      companies_sort_by: '-domain',
    });
    expect(env.store.get).toHaveBeenLastCalledWith({
      page: 1,
      sort: '-domain',
    });
    expect(layout(wrapper).props()).toMatchObject({
      activeSort: 'domain',
      activeOrdering: '-',
    });
  });

  it('drops the sort from the URL when it is empty', async () => {
    const wrapper = await mountPage();
    layout(wrapper).vm.$emit('update:sort', { sort: '', order: '' });
    await flushPromises();
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: { page: '1' },
    });
  });

  it('opens and creates companies', async () => {
    const wrapper = await mountPage();
    wrapper.findAllComponents(Card)[1].vm.$emit('showCompany', 2);
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'companies_dashboard_show',
      params: { accountId: 3, companyId: 2 },
    });
    layout(wrapper).vm.$emit('create');
    expect(env.dialog.open).toHaveBeenCalled();
    wrapper.findComponent(Dialog).vm.$emit('create', { name: 'New' });
    await flushPromises();
    expect(env.store.create).toHaveBeenCalledWith({ name: 'New' });
    expect(env.dialog.onSuccess).toHaveBeenCalled();
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.CREATE.MESSAGES.SUCCESS'
    );
    expect(env.router.push).toHaveBeenLastCalledWith({
      name: 'companies_dashboard_show',
      params: { accountId: 3, companyId: 9 },
    });
    env.store.create.mockRejectedValueOnce(new Error('x'));
    wrapper.findComponent(Dialog).vm.$emit('create', {});
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'COMPANIES.CREATE.MESSAGES.ERROR'
    );
  });
});
