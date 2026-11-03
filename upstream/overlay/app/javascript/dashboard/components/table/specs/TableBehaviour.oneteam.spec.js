/**
 * OneTeam behaviour spec for the shared data table.
 *
 * Covers headers with sizes, sorting clicks, placeholder headers, row
 * cells, the fixed layout, and relaxed versus compact spacing.
 */
import { mount } from '@vue/test-utils';
import Table from '../Table.vue';

const SortButton = {
  name: 'SortButton',
  props: ['header'],
  template: '<span class="sort" />',
};

/**
 * Builds a header like TanStack Table returns.
 *
 * @param {string} id Header id.
 * @param {object} options Sorting and placeholder flags.
 * @returns {object} The header.
 */
const header = (id, { canSort = false, placeholder = false } = {}) => ({
  id,
  isPlaceholder: placeholder,
  getSize: () => 120,
  getContext: () => ({}),
  column: {
    getCanSort: () => canSort,
    toggleSorting: vi.fn(),
    columnDef: { header: () => `head-${id}` },
  },
});

/**
 * Builds a table with three headers and one row.
 *
 * @returns {object} The table and its headers.
 */
const buildTable = () => {
  const headers = [
    header('name', { canSort: true }),
    header('email'),
    header('blank', { placeholder: true }),
  ];
  return {
    headers,
    table: {
      getHeaderGroups: () => [{ id: 'g', headers }],
      getRowModel: () => ({
        rows: [
          {
            id: 'r1',
            getVisibleCells: () => [
              {
                id: 'c1',
                getContext: () => ({}),
                column: { columnDef: { cell: () => 'Ann' } },
              },
            ],
          },
        ],
      }),
    },
  };
};

describe('Table behaviour', () => {
  it('renders relaxed headers and rows and sorts sortable columns', async () => {
    const { table, headers } = buildTable();
    const wrapper = mount(Table, {
      props: { table },
      global: { stubs: { SortButton } },
    });
    const ths = wrapper.findAll('th');
    expect(ths[0].text()).toBe('head-name');
    expect(ths[0].attributes('style')).toContain('width: 120px');
    expect(ths[0].classes()).toContain('ltr:first:rounded-bl-lg');
    expect(ths[0].find('.sort').exists()).toBe(true);
    expect(ths[1].find('.sort').exists()).toBe(false);
    expect(ths[2].text()).toBe('');
    await ths[0].trigger('click');
    await ths[1].trigger('click');
    expect(headers[0].column.toggleSorting).toHaveBeenCalledTimes(1);
    expect(headers[1].column.toggleSorting).not.toHaveBeenCalled();
    expect(wrapper.get('td').text()).toBe('Ann');
    expect(wrapper.get('td').classes()).toContain('py-4');
    expect(wrapper.get('table').classes()).not.toContain('table-fixed');
  });

  it('uses compact spacing and a fixed layout', () => {
    const wrapper = mount(Table, {
      props: { table: buildTable().table, fixed: true, type: 'compact' },
      global: { stubs: { SortButton } },
    });
    expect(wrapper.get('table').classes()).toContain('table-fixed');
    expect(wrapper.get('td').classes()).toContain('py-2');
    expect(wrapper.get('th').classes()).not.toContain(
      'ltr:first:rounded-bl-lg'
    );
  });
});
