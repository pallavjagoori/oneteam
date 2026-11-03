/**
 * OneTeam behaviour spec for the agent conversations table on the
 * overview report.
 *
 * Covers merging agent metrics (with missing metrics and display names),
 * sorting by open conversations then name, the "---" placeholder for zero
 * counts, the saved or default page size, saving a new page size, and the
 * loading and empty states.
 */
import { mount } from '@vue/test-utils';
import AgentTable from '../AgentTable.vue';

const settings = vi.hoisted(() => ({ value: {}, update: vi.fn() }));

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
const AgentCell = {
  name: 'AgentCell',
  props: ['getValue'],
  template: '<i>{{ getValue() }}</i>',
};

const mountTable = props =>
  mount(AgentTable, {
    props,
    global: {
      stubs: {
        Pagination,
        AgentCell,
        Spinner: true,
        EmptyState: { props: ['title'], template: '<p>{{ title }}</p>' },
      },
    },
  });

describe('AgentTable behaviour', () => {
  beforeEach(() => {
    settings.value = {};
  });

  it('merges metrics and sorts by open count then name', () => {
    const wrapper = mountTable({
      agents: [
        { id: 1, name: 'Zed', available_name: 'Zoe' },
        { id: 2, name: 'Amy' },
        { id: 3, name: 'Bob' },
      ],
      agentMetrics: [
        { assignee_id: 2, open: 0, unattended: 0 },
        { assignee_id: 3, open: 4, unattended: 1 },
      ],
    });
    const rows = wrapper
      .findAll('tbody tr')
      .map(row => row.findAll('td').map(cell => cell.text()));
    expect(rows).toEqual([
      ['Bob', '4', '1'],
      ['Amy', '---', '---'],
      ['Zoe', '---', '---'],
    ]);
    expect(wrapper.find('tbody tr td:nth-child(2) span').classes()).toContain(
      'text-n-slate-12'
    );
    expect(wrapper.findComponent(Pagination).props('defaultPageSize')).toBe(10);
    expect(wrapper.find('p').exists()).toBe(false);

    wrapper.findComponent(Pagination).vm.$emit('pageSizeChange', 25);
    expect(settings.update).toHaveBeenCalledWith({
      report_overview_agent_table_page_size: 25,
    });
  });

  it('uses the saved page size and shows loading or empty states', async () => {
    settings.value = { report_overview_agent_table_page_size: 50 };
    const wrapper = mountTable({ isLoading: true });
    expect(wrapper.findComponent(Pagination).props('defaultPageSize')).toBe(50);
    expect(wrapper.text()).toContain(
      'OVERVIEW_REPORTS.AGENT_CONVERSATIONS.LOADING_MESSAGE'
    );
    await wrapper.setProps({ isLoading: false });
    expect(wrapper.find('p').text()).toBe(
      'OVERVIEW_REPORTS.AGENT_CONVERSATIONS.NO_AGENTS'
    );
  });
});
