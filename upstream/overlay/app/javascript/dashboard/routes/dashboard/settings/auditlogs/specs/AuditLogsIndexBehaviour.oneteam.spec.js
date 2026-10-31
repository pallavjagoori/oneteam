/**
 * OneTeam behaviour spec for the audit logs settings page.
 *
 * Covers loading agents and logs on mount (and showing load errors),
 * the empty and filtered-empty messages, rows (log text with joined
 * attributes, time, location or IP), the IP column header flag, the
 * entry count, filters and pages updating the URL, debounced search
 * (minimum length, unchanged terms, URL echoes, leaving the page),
 * refetching on URL changes, and clearing all filters.
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import AuditLogsIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useDebounceFn: fn => fn,
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useStoreGetters: () =>
    new Proxy({}, { get: (_, name) => computed(() => env.getters[name]) }),
}));
vi.mock('shared/helpers/timeHelper', () => ({
  messageTimestamp: ts => `time-${ts}`,
}));
vi.mock('dashboard/helper/auditlogHelper', async importOriginal => ({
  ...(await importOriginal()),
  generateTranslationPayload: item => item.payload,
  generateLogActionKey: item => item.key,
}));

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading', 'noRecordsFound', 'noRecordsMessage'],
  template: '<div><slot name="header" /><slot name="body" /></div>',
};
const Header = {
  name: 'BaseSettingsHeader',
  props: ['searchQuery'],
  emits: ['update:searchQuery'],
  template:
    '<header><slot name="tabs" /><slot name="count" /><slot name="actions" /></header>',
};
const Filters = {
  name: 'AuditLogFilters',
  props: ['type', 'range', 'since', 'until', 'sort'],
  emits: ['update'],
  template: '<div />',
};
const Table = {
  name: 'BaseTable',
  props: ['headers', 'items'],
  template: '<table><slot name="row" :items="items" /></table>',
};
const Row = { name: 'BaseTableRow', template: '<tr><slot /></tr>' };
const Cell = { name: 'BaseTableCell', template: '<td><slot /></td>' };
const Pager = {
  name: 'PaginationFooter',
  props: ['currentPage'],
  emits: ['update:currentPage'],
  template: '<div />',
};
const NextButton = {
  name: 'Button',
  props: ['label'],
  template: '<button>{{ label }}</button>',
};

const logs = [
  {
    id: 1,
    key: 'LOG.A',
    payload: { attributes: ['name', 'email'], values: ['x', 'y'] },
    created_at: 10,
    location: 'Paris',
  },
  {
    id: 2,
    key: 'LOG.B',
    payload: { attributes: 'role', values: 'admin' },
    created_at: 20,
    remote_address: '1.2.3.4',
  },
];

const mountPage = ({
  query = {},
  records = logs,
  ipFlag = false,
  name = 'auditlogs_list',
} = {}) => {
  env.route = reactive({ name, query });
  env.router = {
    push: vi.fn(next => {
      env.route.query = next.query;
    }),
  };
  env.store = { dispatch: vi.fn() };
  env.getters = reactive({
    'auditlogs/getAuditLogs': records,
    'auditlogs/getUIFlags': { fetchingList: false },
    'auditlogs/getMeta': {
      totalEntries: records.length,
      currentPage: '1',
      perPage: 15,
    },
    'agents/getAgents': [],
    'accounts/isFeatureEnabledonAccount': () => ipFlag,
    getCurrentAccountId: 1,
  });
  return mount(AuditLogsIndex, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: Header,
        AuditLogFilters: Filters,
        BaseTable: Table,
        BaseTableRow: Row,
        BaseTableCell: Cell,
        PaginationFooter: Pager,
        Button: NextButton,
      },
      mocks: { $t: key => key },
    },
  });
};

const fetches = () =>
  env.store.dispatch.mock.calls
    .filter(([name]) => name === 'auditlogs/fetch')
    .map(([, filters]) => filters);
const search = async (wrapper, value) => {
  await wrapper.findComponent(Header).vm.$emit('update:searchQuery', value);
  await flushPromises();
};

describe('Audit logs index behaviour', () => {
  it('loads logs and shows rows', async () => {
    const wrapper = mountPage();
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('agents/get');
    expect(fetches()).toEqual([{ page: 1 }]);
    const cells = wrapper
      .findAll('tr')
      .map(tr => tr.findAll('td').map(td => td.text()));
    expect(cells[0][1]).toBe('time-10');
    expect(cells[0][2]).toBe('Paris');
    expect(cells[1][2]).toBe('1.2.3.4');
    expect(wrapper.findComponent(Table).props('headers')[2]).toBe(
      'AUDIT_LOGS.LIST.TABLE_HEADER.LOCATION'
    );
    expect(wrapper.text()).toContain('AUDIT_LOGS.COUNT');
    expect(wrapper.findComponent(Layout).props('noRecordsMessage')).toBe(
      'AUDIT_LOGS.LIST.404'
    );
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('shows the IP header and empty states', async () => {
    let wrapper = mountPage({ ipFlag: true, records: [] });
    expect(wrapper.findComponent(Table).props('headers')[2]).toBe(
      'AUDIT_LOGS.LIST.TABLE_HEADER.IP_ADDRESS'
    );
    expect(wrapper.findComponent(Layout).props('noRecordsFound')).toBe(true);
    expect(wrapper.text()).not.toContain('AUDIT_LOGS.COUNT');
    wrapper = mountPage({
      records: [],
      query: {
        q: 'abc',
        type: 'nope',
        sort: 'asc',
        since: '5',
        until: '9',
        range: 'custom',
      },
    });
    expect(wrapper.findComponent(Layout).props('noRecordsMessage')).toBe(
      'AUDIT_LOGS.SEARCH_404'
    );
    expect(wrapper.findComponent(Filters).props()).toMatchObject({
      range: 'custom',
      since: 5,
      until: 9,
      sort: 'asc',
    });
  });

  it('reports load errors', async () => {
    const wrapper = mountPage();
    env.store.dispatch.mockRejectedValueOnce(new Error('Forbidden'));
    env.route.query = { page: '2' };
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Forbidden');
    env.store.dispatch.mockRejectedValueOnce({});
    env.route.query = { page: '3' };
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      expect.stringContaining('AUDIT_LOGS.API.ERROR_MESSAGE')
    );
    expect(wrapper.exists()).toBe(true);
  });

  it('updates the URL from filters and pages', async () => {
    const wrapper = mountPage({ query: { page: '2', sort: 'desc' } });
    await flushPromises();
    await wrapper.findComponent(Filters).vm.$emit('update', { sort: 'asc' });
    expect(env.router.push).toHaveBeenLastCalledWith({
      name: 'auditlogs_list',
      query: { sort: 'asc' },
    });
    await wrapper.findComponent(Pager).vm.$emit('update:currentPage', 3);
    expect(env.router.push).toHaveBeenLastCalledWith({
      name: 'auditlogs_list',
      query: { sort: 'asc', page: 3 },
    });
    await flushPromises();
    expect(fetches().at(-1)).toEqual({ page: 3, sort: 'asc' });

    await wrapper.find('button').trigger('click');
    expect(env.router.push).toHaveBeenLastCalledWith({
      name: 'auditlogs_list',
      query: {},
    });
  });

  it('debounces search into the URL', async () => {
    const wrapper = mountPage({ query: { q: 'old' } });
    await flushPromises();
    expect(wrapper.findComponent(Header).props('searchQuery')).toBe('old');
    await search(wrapper, 'ab');
    expect(env.router.push).toHaveBeenLastCalledWith({
      name: 'auditlogs_list',
      query: {},
    });
    env.router.push.mockClear();
    await search(wrapper, 'a');
    expect(env.router.push).not.toHaveBeenCalled();
    await search(wrapper, '  invoice ');
    expect(env.router.push).toHaveBeenLastCalledWith({
      name: 'auditlogs_list',
      query: { q: 'invoice' },
    });
    expect(wrapper.findComponent(Header).props('searchQuery')).toBe(
      '  invoice '
    );

    env.route.query = { q: 'from-link' };
    await flushPromises();
    expect(wrapper.findComponent(Header).props('searchQuery')).toBe(
      'from-link'
    );
    env.route.query = {};
    await flushPromises();
    expect(wrapper.findComponent(Header).props('searchQuery')).toBe('');
  });

  it('ignores searches and URL changes after leaving the page', async () => {
    const wrapper = mountPage();
    await flushPromises();
    env.route.name = 'other_page';
    env.route.query = { x: '1' };
    await flushPromises();
    expect(fetches()).toHaveLength(1);
    await search(wrapper, 'invoice');
    expect(env.router.push).not.toHaveBeenCalled();
  });
});
