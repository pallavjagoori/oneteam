/**
 * OneTeam behaviour spec for the SLA reports page.
 *
 * Covers the initial fetches, filter and page changes, downloading the
 * report, and the download failure alert.
 */
import { mount } from '@vue/test-utils';
import SLAReports from '../SLAReports.vue';
import { useAlert } from 'dashboard/composables';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const getters = {
  'slaReports/getAll': [{ id: 1 }],
  'slaReports/getMetrics': {
    hitRate: '90%',
    numberOfSLAMisses: 2,
    numberOfConversations: 20,
  },
  'slaReports/getMeta': { currentPage: '2', count: '40' },
  'slaReports/getUIFlags': { isFetching: false, isFetchingMetrics: true },
};

/**
 * Mounts the page with a fake store.
 *
 * @param {Function} dispatch store dispatch
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = dispatch =>
  mount(SLAReports, {
    global: {
      mocks: { $t: key => key, $store: { dispatch, getters } },
      stubs: {
        ReportHeader: { template: '<header><slot /></header>' },
        V4Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
        SLAReportFilters: {
          name: 'SLAReportFilters',
          emits: ['filterChange'],
          template: '<div />',
        },
        SLAMetrics: {
          name: 'SLAMetrics',
          props: ['hitRate', 'isLoading'],
          template: '<div />',
        },
        SLATable: {
          name: 'SLATable',
          props: ['currentPage', 'totalCount'],
          emits: ['pageChange'],
          template: '<div />',
        },
      },
    },
  });

describe('SLA reports behaviour', () => {
  it('fetches data and reacts to filter and page changes', async () => {
    const dispatch = vi.fn();
    const wrapper = mountPage(dispatch);
    const actions = dispatch.mock.calls.map(([name]) => name);
    expect(actions).toEqual([
      'agents/get',
      'inboxes/get',
      'teams/get',
      'labels/get',
      'sla/get',
      'slaReports/getMetrics',
      'slaReports/get',
    ]);
    expect(wrapper.findComponent({ name: 'SLATable' }).props()).toMatchObject({
      currentPage: 2,
      totalCount: 40,
    });
    expect(wrapper.findComponent({ name: 'SLAMetrics' }).props()).toMatchObject(
      { hitRate: '90%', isLoading: true }
    );
    dispatch.mockClear();
    const filter = { from: 1, to: 1767225600, inbox_id: 3 };
    wrapper
      .findComponent({ name: 'SLAReportFilters' })
      .vm.$emit('filterChange', filter);
    expect(dispatch).toHaveBeenCalledWith('slaReports/get', {
      page: 1,
      ...filter,
    });
    expect(dispatch).toHaveBeenCalledWith('slaReports/getMetrics', filter);
    wrapper.findComponent({ name: 'SLATable' }).vm.$emit('pageChange', 3);
    expect(dispatch).toHaveBeenLastCalledWith('slaReports/get', {
      page: 3,
      ...filter,
    });
    await wrapper.find('button').trigger('click');
    expect(dispatch).toHaveBeenLastCalledWith('slaReports/download', {
      fileName: 'sla-report-01-01-2026.csv',
      ...filter,
    });
  });

  it('alerts when the download fails', async () => {
    const dispatch = vi.fn(name => {
      if (name === 'slaReports/download') throw new Error('no');
    });
    const wrapper = mountPage(dispatch);
    wrapper
      .findComponent({ name: 'SLAReportFilters' })
      .vm.$emit('filterChange', { to: 1767225600 });
    await wrapper.find('button').trigger('click');
    expect(useAlert).toHaveBeenCalledWith('SLA_REPORTS.DOWNLOAD_FAILED');
  });
});
