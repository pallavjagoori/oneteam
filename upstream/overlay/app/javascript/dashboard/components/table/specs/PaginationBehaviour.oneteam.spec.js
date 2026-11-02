/**
 * OneTeam behaviour spec for the shared table pagination bar.
 *
 * Covers the results summary, the three visible page buttons at the
 * start, middle and end (and fewer pages), first/previous/next/last
 * navigation and their disabled states, jumping to a page, the page
 * size selector (including the initial non-default size) and the
 * pageSizeChange event.
 */
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import Pagination from '../Pagination.vue';

const Button = {
  name: 'Button',
  props: ['icon', 'disabled', 'color'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" :data-color="color" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};
const FilterSelect = {
  name: 'FilterSelect',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<div class="size-select" />',
};

const makeTable = ({ pageIndex = 0, pageSize = 10, rows = 95 } = {}) => {
  const state = reactive({ pageIndex, pageSize, rows });
  const pageCount = () => Math.ceil(state.rows / state.pageSize);
  return {
    state,
    getState: () => ({
      pagination: { pageIndex: state.pageIndex, pageSize: state.pageSize },
    }),
    getPageCount: pageCount,
    getRowCount: () => state.rows,
    getCanPreviousPage: () => state.pageIndex > 0,
    getCanNextPage: () => state.pageIndex < pageCount() - 1,
    setPageIndex: vi.fn(index => {
      state.pageIndex = index;
    }),
    previousPage: vi.fn(() => {
      state.pageIndex -= 1;
    }),
    nextPage: vi.fn(() => {
      state.pageIndex += 1;
    }),
    setPageSize: vi.fn(size => {
      state.pageSize = size;
    }),
  };
};

const mountBar = (table, props = {}) =>
  mount(Pagination, {
    props: { table, ...props },
    global: {
      stubs: { Button, FilterSelect },
      mocks: {
        $t: (key, args) => `${key}:${args.start}-${args.end}/${args.total}`,
      },
    },
  });

const pages = wrapper =>
  wrapper.findAll('button:not([data-icon])').map(b => b.text());
const icon = (wrapper, name) => wrapper.find(`[data-icon="${name}"]`);

describe('Pagination behaviour', () => {
  it('shows the first pages and navigates forward', async () => {
    const table = makeTable();
    const wrapper = mountBar(table);
    expect(wrapper.find('p').text()).toBe('REPORT.PAGINATION.RESULTS:1-10/95');
    expect(pages(wrapper)).toEqual(['1', '2', '3']);
    expect(wrapper.find('[data-color="blue"] span').classes()).toContain(
      'text-n-brand'
    );
    expect(
      icon(wrapper, 'i-lucide-chevrons-left').attributes('disabled')
    ).toBeDefined();
    expect(wrapper.find('.size-select').exists()).toBe(false);

    await icon(wrapper, 'i-lucide-chevron-right').trigger('click');
    expect(table.nextPage).toHaveBeenCalled();
    expect(pages(wrapper)).toEqual(['1', '2', '3']);
    await wrapper.findAll('button:not([data-icon])')[2].trigger('click');
    expect(table.setPageIndex).toHaveBeenLastCalledWith(2);
    expect(pages(wrapper)).toEqual(['2', '3', '4']);

    await icon(wrapper, 'i-lucide-chevrons-right').trigger('click');
    expect(table.setPageIndex).toHaveBeenLastCalledWith(9);
    expect(pages(wrapper)).toEqual(['8', '9', '10']);
    expect(wrapper.find('p').text()).toBe('REPORT.PAGINATION.RESULTS:91-95/95');
    expect(
      icon(wrapper, 'i-lucide-chevron-right').attributes('disabled')
    ).toBeDefined();

    await icon(wrapper, 'i-lucide-chevron-left').trigger('click');
    expect(table.previousPage).toHaveBeenCalled();
    await icon(wrapper, 'i-lucide-chevrons-left').trigger('click');
    expect(table.setPageIndex).toHaveBeenLastCalledWith(0);
  });

  it('lists every page when there are three or fewer', () => {
    const wrapper = mountBar(makeTable({ rows: 25 }));
    expect(pages(wrapper)).toEqual(['1', '2', '3']);
    const single = mountBar(makeTable({ rows: 4 }));
    expect(pages(single)).toEqual(['1']);
  });

  it('changes the page size', async () => {
    const table = makeTable();
    const wrapper = mountBar(table, { showPageSizeSelector: true });
    expect(table.setPageSize).not.toHaveBeenCalled();
    const select = wrapper.findComponent(FilterSelect);
    expect(select.props('modelValue')).toBe(10);
    expect(select.props('options').map(o => o.value)).toEqual([
      10, 20, 50, 100,
    ]);
    await select.vm.$emit('update:modelValue', '50');
    expect(table.setPageSize).toHaveBeenCalledWith(50);
    expect(wrapper.emitted('pageSizeChange')[0]).toEqual([50]);
    expect(select.props('modelValue')).toBe(50);
  });

  it('applies a non-default initial page size', () => {
    const table = makeTable();
    mountBar(table, { showPageSizeSelector: true, defaultPageSize: 20 });
    expect(table.setPageSize).toHaveBeenCalledWith(20);

    const other = makeTable();
    mountBar(other, { showPageSizeSelector: true, defaultPageSize: 0 });
    mountBar(other, { defaultPageSize: 20 });
    expect(other.setPageSize).not.toHaveBeenCalled();
  });
});
