/**
 * OneTeam behaviour spec for the search page SearchHeader.
 *
 * Covers searching (with and without recent-search tracking), picking a
 * recent search, and forwarding filter updates.
 */
import { mount } from '@vue/test-utils';
import SearchHeader from '../SearchHeader.vue';

const addToRecentSearches = vi.fn();

const SearchInputStub = {
  name: 'SearchInput',
  props: { modelValue: String },
  emits: ['update:modelValue', 'search', 'selectRecentSearch'],
  methods: { addToRecentSearches },
  template: '<div class="input"><slot /></div>',
};

const SearchFiltersStub = {
  name: 'SearchFilters',
  emits: ['update:modelValue', 'updateFilters'],
  template: '<div class="filters" />',
};

/**
 * Mounts SearchHeader with stubs.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountHeader = () =>
  mount(SearchHeader, {
    props: { initialQuery: 'hi' },
    global: {
      stubs: {
        SearchInput: SearchInputStub,
        SearchFilters: SearchFiltersStub,
        Policy: { template: '<div><slot /></div>' },
      },
    },
  });

describe('SearchHeader behaviour', () => {
  it('starts with the initial query', () => {
    const input = mountHeader().findComponent(SearchInputStub);
    expect(input.props('modelValue')).toBe('hi');
  });

  it('records trimmed searches and emits search', async () => {
    const wrapper = mountHeader();
    const input = wrapper.findComponent(SearchInputStub);
    input.vm.$emit('search', '  order  ');
    input.vm.$emit('search', '   ');
    input.vm.$emit('search', undefined);
    expect(addToRecentSearches).toHaveBeenCalledTimes(1);
    expect(addToRecentSearches).toHaveBeenCalledWith('order');
    expect(wrapper.emitted('search')).toEqual([
      ['  order  '],
      ['   '],
      [undefined],
    ]);
  });

  it('runs a picked recent search and updates the query', async () => {
    const wrapper = mountHeader();
    const input = wrapper.findComponent(SearchInputStub);
    input.vm.$emit('selectRecentSearch', 'refund');
    await wrapper.vm.$nextTick();
    expect(input.props('modelValue')).toBe('refund');
    expect(wrapper.emitted('search')).toEqual([['refund']]);
    input.vm.$emit('update:modelValue', 'typed');
    await wrapper.vm.$nextTick();
    expect(input.props('modelValue')).toBe('typed');
  });

  it('forwards filter changes and the filters model', () => {
    const wrapper = mountHeader();
    const filters = wrapper.findComponent(SearchFiltersStub);
    filters.vm.$emit('updateFilters', { inbox: 1 });
    filters.vm.$emit('update:modelValue', { inbox: 2 });
    expect(wrapper.emitted('filterChange')).toEqual([[{ inbox: 1 }]]);
    expect(wrapper.emitted('update:filters')).toEqual([[{ inbox: 2 }]]);
  });
});
