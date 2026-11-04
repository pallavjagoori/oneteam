/**
 * OneTeam behaviour spec for the team conversations table on the
 * overview report.
 *
 * Covers merging team metrics (with missing metrics), sorting by open
 * conversations then name, the "---" placeholder for zero counts, the
 * saved or default page size, saving a new page size, and the loading
 * and empty states.
 */
import { mount } from '@vue/test-utils';
import TeamTable from '../TeamTable.vue';

const settings = vi.hoisted(() => ({ value: {}, update: vi.fn() }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/useUISettings', async () => {
  const { ref: appRef } = await import('vue');
  return {
    useUISettings: () => ({
      uiSettings: appRef(settings.value),
      updateUISettings: settings.update,
    }),
  };
});

const Pagination = {
  name: 'Pagination',
  props: ['table', 'defaultPageSize'],
  emits: ['pageSizeChange'],
  template: '<nav />',
};

/**
 * Mounts the table.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountTable = props =>
  mount(TeamTable, {
    props,
    global: {
      mocks: { $t: key => key },
      stubs: {
        Pagination,
        Spinner: true,
        EmptyState: { props: ['title'], template: '<p>{{ title }}</p>' },
      },
    },
  });

describe('TeamTable behaviour', () => {
  beforeEach(() => {
    settings.value = {};
  });

  it('merges metrics and sorts by open count then name', () => {
    const wrapper = mountTable({
      teams: [
        { id: 1, name: 'zeta' },
        { id: 2, name: 'alpha' },
        { id: 3, name: 'beta' },
      ],
      teamMetrics: [
        { team_id: 2, open: 0, unattended: 0 },
        { team_id: 3, open: 4, unattended: 1 },
      ],
    });
    const rows = wrapper
      .findAll('tbody tr')
      .map(row => row.findAll('td').map(cell => cell.text()));
    expect(rows).toEqual([
      ['beta', '4', '1'],
      ['alpha', '---', '---'],
      ['zeta', '---', '---'],
    ]);
    expect(wrapper.find('tbody tr td:nth-child(2) span').classes()).toContain(
      'text-n-slate-12'
    );
    expect(
      wrapper.find('tbody tr:nth-child(2) td:nth-child(2) span').classes()
    ).toContain('text-n-slate-11');
    expect(wrapper.findComponent(Pagination).props('defaultPageSize')).toBe(10);
    expect(wrapper.find('p').exists()).toBe(false);
    wrapper.findComponent(Pagination).vm.$emit('pageSizeChange', 25);
    expect(settings.update).toHaveBeenCalledWith({
      report_overview_team_table_page_size: 25,
    });
  });

  it('uses the saved page size and shows loading or empty states', async () => {
    settings.value = { report_overview_team_table_page_size: 50 };
    const wrapper = mountTable({ isLoading: true });
    expect(wrapper.findComponent(Pagination).props('defaultPageSize')).toBe(50);
    expect(wrapper.text()).toContain(
      'OVERVIEW_REPORTS.TEAM_CONVERSATIONS.LOADING_MESSAGE'
    );
    await wrapper.setProps({ isLoading: false });
    expect(wrapper.find('p').text()).toBe(
      'OVERVIEW_REPORTS.TEAM_CONVERSATIONS.NO_TEAMS'
    );
  });
});
