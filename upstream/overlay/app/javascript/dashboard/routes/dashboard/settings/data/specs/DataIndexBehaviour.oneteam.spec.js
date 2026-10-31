/**
 * OneTeam behaviour spec for the data import/export settings page.
 *
 * Covers loading imports, the empty and export tabs, import rows (source
 * icons, names, type labels, counts), opening an import by click or
 * keyboard, the new-import dialog (blocked while an integration import
 * runs), manual refresh, background polling while imports are active
 * (skipping overlapping or hidden refreshes, stopping when imports
 * finish), visibility changes, and keep-alive deactivation/unmount.
 */
import { defineComponent, h, KeepAlive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import DataImportsAPI from 'dashboard/api/dataImports';
import DataIndex from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store', async () => {
  const { ref: appRef } = await import('vue');
  return { useStoreGetters: () => ({ getCurrentAccountId: appRef(1) }) };
});
vi.mock('dashboard/api/dataImports', () => ({ default: { get: vi.fn() } }));

const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading'],
  template: '<div><slot name="header" /><slot name="body" /></div>',
};
const Header = {
  name: 'BaseSettingsHeader',
  template:
    '<header><slot name="tabs" /><slot name="count" /><slot name="actions" /></header>',
};
const Tabs = {
  name: 'TabBar',
  props: ['tabs', 'initialActiveTab'],
  emits: ['tabChanged'],
  template: '<nav />',
};
const NextButton = {
  name: 'Button',
  props: ['label', 'icon', 'disabled', 'isLoading', 'title'],
  template:
    '<button :data-icon="icon" :disabled="disabled">{{ label }}</button>',
};
const Dialog = {
  name: 'NewImportDialog',
  props: ['show', 'hasActiveImport'],
  emits: ['close', 'created'],
  template: '<div />',
};

const fileImport = {
  id: 1,
  name: 'Contacts CSV',
  status: 'completed',
  data_type: 'contacts',
  processed_records: 4,
  created_at: '2026-01-01T00:00:00Z',
};
const intercom = {
  id: 2,
  status: 'processing',
  data_type: 'intercom',
  source_provider: 'intercom',
  import_types: ['contacts', 'conversations'],
  stats: { contacts: { imported: 2 } },
};
const freshdesk = {
  id: 3,
  status: 'pending',
  data_type: 'freshdesk',
  source_provider: 'freshdesk',
  import_types: ['tickets'],
};

const respond = payload =>
  DataImportsAPI.get.mockResolvedValueOnce({ data: { payload } });

const mountPage = () => {
  const show = ref(true);
  const Host = defineComponent({
    setup: () => () => h(KeepAlive, null, [show.value ? h(DataIndex) : null]),
  });
  const wrapper = mount(Host, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        BaseSettingsHeader: Header,
        TabBar: Tabs,
        Button: NextButton,
        NewImportDialog: Dialog,
        Icon: true,
      },
      mocks: {
        $t: (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key),
      },
      directives: { tooltip: {} },
    },
  });
  env.mounted.push(wrapper);
  return { wrapper, show };
};

const button = (wrapper, label) =>
  wrapper.findAllComponents(NextButton).find(b => b.props('label') === label);
const NEW = 'DATA_IMPORTS.TABLE.NEW_IMPORT';

describe('Data settings index behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    env.router = { push: vi.fn() };
    env.mounted = [];
    DataImportsAPI.get.mockReset();
    DataImportsAPI.get.mockResolvedValue({ data: { payload: [] } });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
  });
  afterEach(() => {
    env.mounted.forEach(wrapper => wrapper.unmount());
    vi.useRealTimers();
  });

  it('shows the empty state, the export tab and opens the dialog', async () => {
    DataImportsAPI.get.mockResolvedValueOnce({ data: {} });
    const { wrapper } = mountPage();
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(true);
    await flushPromises();
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(false);
    expect(wrapper.text()).toContain('DATA_IMPORTS.TABLE.EMPTY');
    expect(wrapper.findComponent(Tabs).props('initialActiveTab')).toBe(0);

    await button(wrapper, NEW).trigger('click');
    expect(wrapper.findComponent(Dialog).props('show')).toBe(true);
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(wrapper.findComponent(Dialog).props('show')).toBe(false);
    await wrapper
      .findAllComponents(NextButton)
      .filter(b => b.props('label') === NEW)[1]
      .trigger('click');
    await wrapper.findComponent(Dialog).vm.$emit('created', 42);
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'settings_data_import_show',
      params: { accountId: 1, dataImportId: 42 },
    });

    await wrapper.findComponent(Tabs).vm.$emit('tabChanged', { key: 'export' });
    expect(wrapper.text()).toContain('DATA_IMPORTS.EXPORT.TITLE');
    expect(button(wrapper, NEW)).toBeUndefined();
    expect(wrapper.findComponent(Tabs).props('initialActiveTab')).toBe(1);
  });

  it('lists imports and opens them', async () => {
    respond([
      fileImport,
      { ...intercom, status: 'completed' },
      { id: 4, data_type: 'conversations', status: undefined },
      { id: 5, data_type: 'other', import_types: [] },
    ]);
    const { wrapper } = mountPage();
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('DATA_IMPORTS.TABLE.COUNT:{"count":4}');
    expect(text).toContain('Contacts CSV');
    expect(text).toContain('DATA_IMPORTS.TABLE.UNNAMED');
    expect(text).toContain(
      'DATA_IMPORTS.TYPES.CONTACTS, DATA_IMPORTS.TYPES.CONVERSATIONS'
    );
    expect(text).toContain('other');
    expect(text).toContain('DATA_IMPORTS.TABLE.IMPORTED_COUNT:{"count":2}');
    expect(wrapper.find('img').attributes('src')).toContain('intercom');
    expect(text).not.toContain('DATA_IMPORTS.MONITOR.LIVE');

    const rows = wrapper.findAll('[role="button"]');
    await rows[0].trigger('click');
    await rows[1].trigger('keydown.enter');
    await rows[2].trigger('keydown.space');
    await wrapper.findAll('[data-icon="i-lucide-eye"]')[3].trigger('click');
    expect(
      env.router.push.mock.calls.map(([route]) => route.params.dataImportId)
    ).toEqual([1, 2, 4, 5]);
  });

  it('blocks new imports while an integration import runs', async () => {
    respond([intercom]);
    const { wrapper } = mountPage();
    await flushPromises();
    expect(button(wrapper, NEW).props()).toMatchObject({
      disabled: true,
      title: 'DATA_IMPORTS.DRAWER.ACTIVE_IMPORT',
    });
    await button(wrapper, NEW).vm.$emit('click');
    expect(wrapper.findComponent(Dialog).props()).toMatchObject({
      show: false,
      hasActiveImport: true,
    });
    expect(wrapper.text()).toContain('DATA_IMPORTS.MONITOR.LIVE:{"seconds":5}');
  });

  it('refreshes on demand without the full loader', async () => {
    const { wrapper } = mountPage();
    await flushPromises();
    let finish;
    DataImportsAPI.get.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await wrapper.find('[data-icon="i-lucide-refresh-cw"]').trigger('click');
    expect(wrapper.find('[data-icon="i-lucide-refresh-cw"]').exists()).toBe(
      true
    );
    expect(
      wrapper
        .findAllComponents(NextButton)
        .find(b => b.props('icon') === 'i-lucide-refresh-cw')
        .props('isLoading')
    ).toBe(true);
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(false);
    finish({ data: { payload: [freshdesk] } });
    await flushPromises();
    expect(wrapper.text()).toContain('tickets');

    // Refreshing with an active import starts polling.
    DataImportsAPI.get.mockClear();
    await vi.advanceTimersByTimeAsync(5000);
    expect(DataImportsAPI.get).toHaveBeenCalledTimes(1);
    // A refresh while already polling keeps the existing timer.
    DataImportsAPI.get.mockResolvedValueOnce({
      data: { payload: [freshdesk] },
    });
    await wrapper.find('[data-icon="i-lucide-refresh-cw"]').trigger('click');
    await flushPromises();
    DataImportsAPI.get.mockClear();
    await vi.advanceTimersByTimeAsync(5000);
    expect(DataImportsAPI.get).toHaveBeenCalledTimes(1);
    // A refresh that finds nothing active stops polling.
    DataImportsAPI.get.mockResolvedValueOnce({ data: { payload: [] } });
    await wrapper.find('[data-icon="i-lucide-refresh-cw"]').trigger('click');
    await flushPromises();
    DataImportsAPI.get.mockClear();
    await vi.advanceTimersByTimeAsync(10000);
    expect(DataImportsAPI.get).not.toHaveBeenCalled();
  });

  it('polls active imports in the background until they finish', async () => {
    respond([freshdesk]);
    mountPage();
    await flushPromises();
    DataImportsAPI.get.mockClear();

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    await vi.advanceTimersByTimeAsync(5000);
    expect(DataImportsAPI.get).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });

    let finish;
    DataImportsAPI.get.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(DataImportsAPI.get).toHaveBeenCalledTimes(1);
    finish({ data: { payload: [freshdesk] } });
    await flushPromises();

    respond([{ ...freshdesk, status: 'completed' }]);
    await vi.advanceTimersByTimeAsync(5000);
    DataImportsAPI.get.mockClear();
    await vi.advanceTimersByTimeAsync(10000);
    expect(DataImportsAPI.get).not.toHaveBeenCalled();
  });

  it('refreshes when the tab becomes visible', async () => {
    respond([freshdesk]);
    const { show } = mountPage();
    await flushPromises();
    DataImportsAPI.get.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(DataImportsAPI.get).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(DataImportsAPI.get).toHaveBeenCalledTimes(1);

    show.value = false;
    await flushPromises();
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(10000);
    expect(DataImportsAPI.get).toHaveBeenCalledTimes(1);
  });

  it('ignores visibility changes with nothing active', async () => {
    mountPage();
    await flushPromises();
    DataImportsAPI.get.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(DataImportsAPI.get).not.toHaveBeenCalled();
  });

  it('stops when deactivated mid-load and on unmount', async () => {
    let finish;
    DataImportsAPI.get.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const { wrapper, show } = mountPage();
    show.value = false;
    await flushPromises();
    finish({ data: { payload: [freshdesk] } });
    await flushPromises();
    DataImportsAPI.get.mockClear();
    await vi.advanceTimersByTimeAsync(10000);
    expect(DataImportsAPI.get).not.toHaveBeenCalled();

    respond([freshdesk]);
    show.value = true;
    await flushPromises();
    DataImportsAPI.get.mockClear();
    env.mounted = [];
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(10000);
    expect(DataImportsAPI.get).not.toHaveBeenCalled();
  });
});
