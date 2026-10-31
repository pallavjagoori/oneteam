/**
 * OneTeam behaviour spec for the data import detail page.
 *
 * Child sections are stubbed and the page runs inside KeepAlive. Covers
 * loading (sections open only when they have records), manual refresh,
 * skip log type changes (ignored while busy or unchanged, stale answers
 * dropped), polling while the import is active (paused while the tab is
 * hidden, never overlapping), refreshing when the tab becomes visible,
 * abandoning, retrying (success and failure), downloading error and
 * skip logs as CSV, and stopping everything when the page is left.
 */
import { KeepAlive, defineComponent, h, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import DataImportsAPI from 'dashboard/api/dataImports';
import Show from '../Show.vue';

vi.mock('dashboard/api/dataImports', () => ({
  default: {
    show: vi.fn(),
    retry: vi.fn(),
    abandon: vi.fn(),
    downloadErrorLogs: vi.fn(),
    downloadSkipLogs: vi.fn(),
  },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { dataImportId: 7 } }),
}));

const section = (name, extra = []) => ({
  name,
  props: [
    'dataImport',
    'isOpen',
    'isDownloading',
    'selectedType',
    'isChangingType',
    'isRefreshing',
    'isRetrying',
    'isAbandoning',
    'isPolling',
    'title',
    ...extra,
  ],
  emits: ['toggle', 'download', 'changeType', 'refresh', 'retry', 'abandon'],
  template: `<div class="${name}" />`,
});
const Header = section('ImportDetailHeader');
const Errors = section('ImportErrorsSection');
const SkipLogs = section('ImportSkipLogsSection');
const Progress = section('ImportProgress');
const Layout = {
  name: 'SettingsLayout',
  props: ['isLoading'],
  template: '<main><slot name="header" /><slot name="body" /></main>',
};

const record = (extra = {}) => ({
  id: 7,
  status: 'completed',
  import_errors_count: 0,
  skip_logs_count: 0,
  ...extra,
});
const reply = data => ({ data });

let show;
let wrappers = [];

const mountPage = async () => {
  show = ref(true);
  const Host = defineComponent({
    setup: () => () => h(KeepAlive, null, [show.value ? h(Show) : null]),
  });
  const wrapper = mount(Host, {
    global: {
      stubs: {
        SettingsLayout: Layout,
        ImportDetailHeader: Header,
        ImportErrorsSection: Errors,
        ImportSkipLogsSection: SkipLogs,
        ImportProgress: Progress,
        ImportSummaryTiles: true,
      },
      mocks: { $t: key => key },
      // A failed skip log type change rejects its event handler; keep it out of the run.
      config: { errorHandler: () => {} },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
};

const setHidden = value =>
  Object.defineProperty(document, 'hidden', { configurable: true, value });

describe('Data import show behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
  });

  afterEach(() => {
    wrappers.forEach(w => w.unmount());
    wrappers = [];
    vi.useRealTimers();
  });

  it('loads the import and opens sections with records', async () => {
    DataImportsAPI.show.mockResolvedValue(
      reply(
        record({
          import_errors_count: 2,
          import_types: ['contacts'],
          skip_logs_filters: { selected_source_object_type: 'user' },
        })
      )
    );
    const wrapper = await mountPage();
    expect(DataImportsAPI.show).toHaveBeenCalledWith(7, {
      skip_logs_type: undefined,
    });
    expect(wrapper.findComponent(Layout).props('isLoading')).toBe(false);
    expect(wrapper.findComponent(Errors).props('isOpen')).toBe(true);
    expect(wrapper.findComponent(SkipLogs).props()).toMatchObject({
      isOpen: false,
      selectedType: 'user',
    });
    expect(wrapper.findComponent(Progress).exists()).toBe(true);

    await wrapper.findComponent(Errors).vm.$emit('toggle');
    await wrapper.findComponent(SkipLogs).vm.$emit('toggle');
    expect(wrapper.findComponent(Errors).props('isOpen')).toBe(false);
    expect(wrapper.findComponent(SkipLogs).props('isOpen')).toBe(true);
  });

  it('refreshes manually and changes the skip log type', async () => {
    DataImportsAPI.show.mockResolvedValue(
      reply(record({ skip_logs_count: 1 }))
    );
    const wrapper = await mountPage();
    expect(wrapper.findComponent(Progress).exists()).toBe(false);
    let finish;
    DataImportsAPI.show.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    wrapper.findComponent(Header).vm.$emit('refresh');
    await flushPromises();
    expect(wrapper.findComponent(Header).props('isRefreshing')).toBe(true);
    finish(reply(record()));
    await flushPromises();
    expect(wrapper.findComponent(Header).props('isRefreshing')).toBe(false);

    DataImportsAPI.show.mockClear();
    DataImportsAPI.show.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    wrapper.findComponent(SkipLogs).vm.$emit('changeType', 'company');
    await flushPromises();
    expect(wrapper.findComponent(SkipLogs).props()).toMatchObject({
      selectedType: 'company',
      isChangingType: true,
    });
    wrapper.findComponent(SkipLogs).vm.$emit('changeType', 'user');
    finish(reply(record()));
    await flushPromises();
    expect(DataImportsAPI.show).toHaveBeenCalledTimes(1);
    expect(DataImportsAPI.show).toHaveBeenCalledWith(7, {
      skip_logs_type: 'company',
    });
    expect(wrapper.findComponent(SkipLogs).props()).toMatchObject({
      selectedType: 'company',
      isChangingType: false,
    });
    wrapper.findComponent(SkipLogs).vm.$emit('changeType', 'company');
    expect(DataImportsAPI.show).toHaveBeenCalledTimes(1);

    DataImportsAPI.show.mockRejectedValueOnce(new Error('x'));
    wrapper.findComponent(SkipLogs).vm.$emit('changeType', 'deal');
    await flushPromises();
    expect(wrapper.findComponent(SkipLogs).props('isChangingType')).toBe(false);
  });

  it('polls an active import until it finishes', async () => {
    DataImportsAPI.show.mockResolvedValue(
      reply(record({ status: 'processing' }))
    );
    const wrapper = await mountPage();
    DataImportsAPI.show.mockClear();

    setHidden(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(DataImportsAPI.show).not.toHaveBeenCalled();
    setHidden(false);

    let finish;
    DataImportsAPI.show.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await vi.advanceTimersByTimeAsync(5000);
    expect(wrapper.findComponent(Header).props('isPolling')).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(DataImportsAPI.show).toHaveBeenCalledTimes(1);
    finish(reply(record({ status: 'processing' })));
    await flushPromises();

    DataImportsAPI.show.mockResolvedValueOnce(reply(record()));
    await vi.advanceTimersByTimeAsync(5000);
    expect(wrapper.findComponent(Header).props('isPolling')).toBe(false);
    DataImportsAPI.show.mockClear();
    await vi.advanceTimersByTimeAsync(20000);
    expect(DataImportsAPI.show).not.toHaveBeenCalled();
  });

  it('refreshes when the tab becomes visible and stops when left', async () => {
    DataImportsAPI.show.mockResolvedValue(reply(record({ status: 'pending' })));
    await mountPage();
    DataImportsAPI.show.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(DataImportsAPI.show).toHaveBeenCalledTimes(1);
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(DataImportsAPI.show).toHaveBeenCalledTimes(1);
    setHidden(false);

    show.value = false;
    await flushPromises();
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(10000);
    expect(DataImportsAPI.show).toHaveBeenCalledTimes(1);

    show.value = true;
    await flushPromises();
    expect(DataImportsAPI.show).toHaveBeenCalledTimes(2);
  });

  it('ignores visibility changes for finished imports', async () => {
    DataImportsAPI.show.mockResolvedValue(reply(record()));
    await mountPage();
    DataImportsAPI.show.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(DataImportsAPI.show).not.toHaveBeenCalled();
  });

  it('stops after leaving while the first load is pending', async () => {
    let finish;
    DataImportsAPI.show.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = await mountPage();
    show.value = false;
    await flushPromises();
    finish(reply(record({ status: 'processing', import_errors_count: 1 })));
    await flushPromises();
    DataImportsAPI.show.mockClear();
    await vi.advanceTimersByTimeAsync(10000);
    expect(DataImportsAPI.show).not.toHaveBeenCalled();
    expect(wrapper.exists()).toBe(true);
  });

  it('abandons and retries imports', async () => {
    DataImportsAPI.show.mockResolvedValue(
      reply(record({ status: 'processing' }))
    );
    const wrapper = await mountPage();
    DataImportsAPI.abandon.mockResolvedValue(
      reply(record({ status: 'abandoned' }))
    );
    wrapper.findComponent(Header).vm.$emit('abandon');
    await flushPromises();
    expect(DataImportsAPI.abandon).toHaveBeenCalledWith(7);
    expect(useAlert).toHaveBeenLastCalledWith(
      'DATA_IMPORTS.ALERTS.IMPORT_ABANDONED'
    );
    expect(wrapper.findComponent(Header).props('isAbandoning')).toBe(false);

    DataImportsAPI.retry.mockRejectedValueOnce(new Error('x'));
    wrapper.findComponent(Header).vm.$emit('retry');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'DATA_IMPORTS.ALERTS.IMPORT_RETRY_FAILED'
    );
    DataImportsAPI.retry.mockResolvedValueOnce(
      reply(record({ status: 'pending' }))
    );
    wrapper.findComponent(Header).vm.$emit('retry');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'DATA_IMPORTS.ALERTS.IMPORT_RETRIED'
    );
    DataImportsAPI.show.mockClear();
    await vi.advanceTimersByTimeAsync(5000);
    expect(DataImportsAPI.show).toHaveBeenCalledTimes(1);
  });

  it('downloads error and skip logs as CSV files', async () => {
    DataImportsAPI.show.mockResolvedValue(reply(record()));
    const wrapper = await mountPage();
    window.URL.createObjectURL = vi.fn(() => 'blob:csv');
    window.URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function capture() {
        click.last = { href: this.href, download: this.download };
      });
    DataImportsAPI.downloadErrorLogs.mockResolvedValue(reply('a,b'));
    wrapper.findComponent(Errors).vm.$emit('download');
    await flushPromises();
    expect(click.last).toEqual({
      href: 'blob:csv',
      download: 'data-import-7-error-logs.csv',
    });
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv');
    DataImportsAPI.downloadSkipLogs.mockResolvedValue(reply('c,d'));
    wrapper.findComponent(SkipLogs).vm.$emit('download');
    await flushPromises();
    expect(click.last.download).toBe('data-import-7-skip-logs.csv');
    expect(wrapper.findComponent(SkipLogs).props('isDownloading')).toBe(false);
    click.mockRestore();
  });

  it('drops a stale answer after a retry starts', async () => {
    DataImportsAPI.show.mockResolvedValue(
      reply(record({ status: 'processing' }))
    );
    const wrapper = await mountPage();
    let finish;
    DataImportsAPI.show.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    wrapper.findComponent(Header).vm.$emit('refresh');
    DataImportsAPI.retry.mockResolvedValueOnce(
      reply(record({ status: 'completed', retried: true }))
    );
    wrapper.findComponent(Header).vm.$emit('retry');
    await flushPromises();
    finish(reply(record({ status: 'processing', stale: true })));
    await flushPromises();
    expect(wrapper.findComponent(Header).props('dataImport')).toMatchObject({
      retried: true,
    });
  });
});
