/**
 * OneTeam behaviour spec for the companies list layout.
 *
 * Covers forwarding the header's search, sort and create events, the
 * default slot, paging, and hiding the pagination footer.
 */
import { mount } from '@vue/test-utils';
import CompaniesListLayout from '../CompaniesListLayout.vue';

const CompanyHeader = {
  name: 'CompanyHeader',
  props: ['searchValue', 'headerTitle', 'activeSort', 'activeOrdering'],
  emits: ['search', 'update:sort', 'create'],
  template: '<header />',
};
const PaginationFooter = {
  name: 'PaginationFooter',
  props: ['currentPage', 'totalItems', 'itemsPerPage'],
  emits: ['update:currentPage'],
  template: '<nav />',
};

/**
 * Mounts the layout with stubbed header and footer.
 *
 * @param {object} props Layout props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountLayout = (props = {}) =>
  mount(CompaniesListLayout, {
    props,
    slots: { default: '<p class="list">Rows</p>' },
    global: { stubs: { CompanyHeader, PaginationFooter } },
  });

describe('CompaniesListLayout behaviour', () => {
  it('forwards header events and paging', () => {
    const wrapper = mountLayout({ headerTitle: 'Companies', currentPage: 2 });
    expect(wrapper.find('.list').exists()).toBe(true);
    const header = wrapper.getComponent(CompanyHeader);
    expect(header.props('headerTitle')).toBe('Companies');
    header.vm.$emit('search', 'acme');
    header.vm.$emit('update:sort', 'name');
    header.vm.$emit('create');
    expect(wrapper.emitted('search')).toEqual([['acme']]);
    expect(wrapper.emitted('update:sort')).toEqual([['name']]);
    expect(wrapper.emitted('create')).toHaveLength(1);

    const footer = wrapper.getComponent(PaginationFooter);
    expect(footer.props()).toMatchObject({ currentPage: 2, itemsPerPage: 50 });
    footer.vm.$emit('update:currentPage', 3);
    expect(wrapper.emitted('update:currentPage')).toEqual([[3]]);
  });

  it('hides the pagination footer when asked', () => {
    const wrapper = mountLayout({ showPaginationFooter: false });
    expect(wrapper.findComponent(PaginationFooter).exists()).toBe(false);
  });
});
