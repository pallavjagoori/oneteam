/**
 * OneTeam behaviour spec for the CSAT responses report page.
 *
 * Covers loading agents, the team filter flag, applying filters (with
 * tracking only after the first load) to fetch metrics and responses,
 * paging, downloading the report, and the alerts when a fetch or the
 * download throws.
 */
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { useAlert, useTrack } from 'dashboard/composables';
import { REPORTS_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import { generateFileName } from 'dashboard/helper/downloadHelper';
import CsatResponses from '../CsatResponses.vue';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

const named = (name, props = [], emits = []) => ({
  name,
  props,
  emits,
  template: `<div class="${name}"><slot /></div>`,
});
const V4Button = {
  name: 'V4Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const CsatFilters = named('CsatFilters', ['showTeamFilter'], ['filterChange']);
const CsatMetrics = named('CsatMetrics', ['filters']);
const CsatTable = named('CsatTable', ['pageIndex'], ['pageChange']);

const mountPage = (dispatch = vi.fn(), teams = true) => {
  const isFeatureEnabled = vi.fn(() => teams);
  const store = createStore({
    getters: {
      getCurrentAccountId: () => 1,
      'accounts/isFeatureEnabledonAccount': () => isFeatureEnabled,
    },
  });
  store.dispatch = dispatch;
  const wrapper = mount(CsatResponses, {
    global: {
      plugins: [store],
      mocks: { $t: key => key },
      stubs: {
        ReportHeader: named('ReportHeader', ['headerTitle']),
        V4Button,
        CsatFilters,
        CsatMetrics,
        CsatTable,
      },
    },
  });
  return { wrapper, dispatch, isFeatureEnabled };
};

const filters = {
  from: 100,
  to: 200,
  selectedAgents: [{ id: 4 }, { id: 5 }],
  selectedInbox: { id: 6 },
  selectedTeam: { id: 7 },
  selectedRating: { value: 3 },
};
const payload = {
  from: 100,
  to: 200,
  user_ids: [4, 5],
  inbox_id: 6,
  team_id: 7,
  rating: 3,
};

describe('CsatResponses behaviour', () => {
  it('loads agents and passes the team flag', () => {
    const { wrapper, dispatch, isFeatureEnabled } = mountPage();
    expect(dispatch).toHaveBeenCalledWith('agents/get');
    expect(isFeatureEnabled).toHaveBeenCalledWith(1, 'team_management');
    expect(wrapper.findComponent(CsatFilters).props('showTeamFilter')).toBe(
      true
    );
    expect(wrapper.text()).toContain('CSAT_REPORTS.DOWNLOAD');
  });

  it('applies filters and tracks changes after the first load', async () => {
    const { wrapper, dispatch } = mountPage();
    const filter = wrapper.findComponent(CsatFilters);
    await filter.vm.$emit('filterChange', filters);
    expect(useTrack).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith('csat/getMetrics', payload);
    expect(dispatch).toHaveBeenCalledWith('csat/get', { page: 1, ...payload });
    expect(wrapper.findComponent(CsatMetrics).props('filters')).toEqual(
      payload
    );

    await filter.vm.$emit('filterChange', {
      from: 1,
      to: 2,
      selectedAgents: [],
    });
    expect(useTrack).toHaveBeenCalledWith(REPORTS_EVENTS.FILTER_REPORT, {
      filterType: 'date',
      reportType: 'csat',
    });
    expect(dispatch).toHaveBeenLastCalledWith('csat/get', {
      page: 1,
      from: 1,
      to: 2,
      user_ids: [],
      inbox_id: undefined,
      team_id: undefined,
      rating: undefined,
    });
  });

  it('pages through responses', async () => {
    const { wrapper, dispatch } = mountPage(vi.fn(), false);
    expect(wrapper.findComponent(CsatFilters).props('showTeamFilter')).toBe(
      false
    );
    await wrapper.findComponent(CsatTable).vm.$emit('pageChange', 2);
    expect(wrapper.findComponent(CsatTable).props('pageIndex')).toBe(2);
    expect(dispatch).toHaveBeenLastCalledWith(
      'csat/get',
      expect.objectContaining({ page: 3 })
    );
  });

  it('downloads the report', async () => {
    const { wrapper, dispatch } = mountPage();
    await wrapper.findComponent(CsatFilters).vm.$emit('filterChange', filters);
    await wrapper.find('button').trigger('click');
    expect(dispatch).toHaveBeenLastCalledWith('csat/downloadCSATReports', {
      fileName: generateFileName({ type: 'csat', to: 200 }),
      ...payload,
    });
  });

  it('alerts when fetching or downloading throws', async () => {
    const dispatch = vi.fn(action => {
      if (action !== 'agents/get') throw new Error('boom');
    });
    const { wrapper } = mountPage(dispatch);
    await wrapper.findComponent(CsatFilters).vm.$emit('filterChange', filters);
    expect(useAlert).toHaveBeenCalledWith('REPORT.DATA_FETCHING_FAILED');
    await wrapper.find('button').trigger('click');
    expect(useAlert).toHaveBeenCalledWith(
      'REPORT.CSAT_REPORTS.DOWNLOAD_FAILED'
    );
  });
});
