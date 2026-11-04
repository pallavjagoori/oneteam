/**
 * OneTeam behaviour spec for the SLA report SLATable.
 *
 * Covers the loading and empty states, listing report rows, when the
 * footer shows on the first and later pages, and page changes.
 */
import { mount } from '@vue/test-utils';
import SLATable from '../SLATable.vue';

const FooterStub = {
  name: 'TableFooter',
  emits: ['pageChange'],
  template: '<footer />',
};

const REPORT = {
  applied_sla: { id: 1, sla_name: 'Gold' },
  conversation: { id: 9 },
  sla_events: [],
};

/**
 * Mounts the table.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountTable = props =>
  mount(SLATable, {
    props,
    global: {
      mocks: { $t: key => key },
      stubs: {
        TableHeaderCell: true,
        Spinner: true,
        TableFooter: FooterStub,
        SLAReportItem: { props: ['slaName'], template: '<div class="row" />' },
      },
    },
  });

describe('SLATable behaviour', () => {
  it('shows the loader', () => {
    expect(mountTable({ isLoading: true }).text()).toContain(
      'SLA_REPORTS.LOADING'
    );
  });

  it('shows no records and no footer on an empty first page', () => {
    const wrapper = mountTable({});
    expect(wrapper.text()).toContain('SLA_REPORTS.NO_RECORDS');
    expect(wrapper.findComponent(FooterStub).exists()).toBe(false);
  });

  it('shows the footer when the first page overflows', () => {
    const wrapper = mountTable({
      slaReports: [REPORT],
      totalCount: 30,
      pageSize: 25,
    });
    expect(wrapper.findAll('.row')).toHaveLength(1);
    wrapper.findComponent(FooterStub).vm.$emit('pageChange', 2);
    expect(wrapper.emitted('pageChange')).toEqual([[2]]);
  });

  it('shows the footer on later pages with rows only', () => {
    expect(
      mountTable({ slaReports: [REPORT], currentPage: 2 })
        .findComponent(FooterStub)
        .exists()
    ).toBe(true);
    expect(
      mountTable({ currentPage: 2 }).findComponent(FooterStub).exists()
    ).toBe(false);
  });
});
