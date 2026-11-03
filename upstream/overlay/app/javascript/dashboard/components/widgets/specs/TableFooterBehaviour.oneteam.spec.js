/**
 * OneTeam behaviour spec for the table footer.
 *
 * Covers the result range and page count passed to its parts, forwarding
 * page changes, and hiding the footer when empty or past the last page.
 */
import { mount } from '@vue/test-utils';
import TableFooter from '../TableFooter.vue';

const Results = {
  name: 'TableFooterResults',
  props: ['firstIndex', 'lastIndex', 'totalCount'],
  template: '<span class="results" />',
};
const Pagination = {
  name: 'TableFooterPagination',
  props: ['currentPage', 'totalPages'],
  emits: ['pageChange'],
  template: '<nav class="pages" />',
};

/**
 * Mounts the footer with the given props.
 *
 * @param {object} props - Component props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountFooter = props =>
  mount(TableFooter, {
    props,
    global: {
      stubs: { TableFooterResults: Results, TableFooterPagination: Pagination },
    },
  });

describe('TableFooter behaviour', () => {
  it('shows the range for the last page and forwards page changes', () => {
    const wrapper = mountFooter({
      currentPage: 3,
      pageSize: 10,
      totalCount: 25,
    });
    expect(wrapper.getComponent(Results).props()).toEqual({
      firstIndex: 21,
      lastIndex: 25,
      totalCount: 25,
    });
    const pages = wrapper.getComponent(Pagination);
    expect(pages.props('totalPages')).toBe(3);
    pages.vm.$emit('pageChange', 2);
    expect(wrapper.emitted('pageChange')).toEqual([[2]]);
  });

  it('hides when there are no records or the page is past the end', () => {
    expect(mountFooter({ totalCount: 0 }).find('footer').exists()).toBe(false);
    expect(
      mountFooter({ currentPage: 5, pageSize: 10, totalCount: 25 })
        .find('footer')
        .exists()
    ).toBe(false);
  });
});
