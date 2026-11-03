/**
 * OneTeam behaviour spec for the companies page header.
 *
 * Covers the title, the optional search box, the sort menu and the
 * create action.
 */
import { mount } from '@vue/test-utils';
import CompanyHeader from '../CompanyHeader.vue';

const CompanySearchInput = {
  name: 'CompanySearchInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input />',
};
const CompanySortMenu = {
  name: 'CompanySortMenu',
  props: ['activeSort', 'activeOrdering'],
  emits: ['update:sort'],
  template: '<div />',
};
const CompanyMoreActions = {
  name: 'CompanyMoreActions',
  emits: ['create'],
  template: '<div />',
};

/**
 * Mounts the header.
 *
 * @param {object} props Header props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountHeader = props =>
  mount(CompanyHeader, {
    props: { headerTitle: 'Companies', ...props },
    global: {
      stubs: { CompanySearchInput, CompanySortMenu, CompanyMoreActions },
      mocks: { $t: key => key },
    },
  });

describe('CompanyHeader behaviour', () => {
  it('relays search, sort and create', () => {
    const wrapper = mountHeader({ searchValue: 'ac', activeOrdering: '-' });
    expect(wrapper.text()).toContain('Companies');
    const search = wrapper.getComponent(CompanySearchInput);
    expect(search.props('modelValue')).toBe('ac');
    search.vm.$emit('update:modelValue', 'acme');
    const sort = wrapper.getComponent(CompanySortMenu);
    expect(sort.props()).toEqual({
      activeSort: 'last_activity_at',
      activeOrdering: '-',
    });
    sort.vm.$emit('update:sort', { sort: 'name' });
    wrapper.getComponent(CompanyMoreActions).vm.$emit('create');
    expect(wrapper.emitted('search')).toEqual([['acme']]);
    expect(wrapper.emitted('update:sort')).toEqual([[{ sort: 'name' }]]);
    expect(wrapper.emitted('create')).toHaveLength(1);
  });

  it('hides the search box', () => {
    expect(
      mountHeader({ showSearch: false })
        .findComponent(CompanySearchInput)
        .exists()
    ).toBe(false);
  });
});
