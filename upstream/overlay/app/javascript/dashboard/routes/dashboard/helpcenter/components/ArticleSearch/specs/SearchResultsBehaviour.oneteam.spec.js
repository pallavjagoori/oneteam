/**
 * OneTeam behaviour spec for the article search SearchResults list.
 *
 * Covers the loading and no result messages, listing articles, and
 * forwarding preview and insert events.
 */
import { mount } from '@vue/test-utils';
import SearchResults from '../SearchResults.vue';

const ItemStub = {
  name: 'SearchResultItem',
  props: ['id', 'title', 'category'],
  emits: ['preview', 'insert'],
  template: '<div class="item">{{ title }}</div>',
};

/**
 * Mounts the results.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountResults = props =>
  mount(SearchResults, {
    props,
    global: {
      mocks: { $t: key => key },
      stubs: { SearchResultItem: ItemStub },
    },
  });

describe('SearchResults behaviour', () => {
  it('shows the loader', () => {
    expect(mountResults({ isLoading: true }).text()).toBe(
      'HELP_CENTER.ARTICLE_SEARCH_RESULT.SEARCH_LOADER'
    );
  });

  it('shows no results for a query without articles', () => {
    expect(mountResults({ searchQuery: 'xyz' }).text()).toBe(
      'HELP_CENTER.ARTICLE_SEARCH_RESULT.NO_RESULT'
    );
  });

  it('shows nothing without a query', () => {
    expect(mountResults({}).text()).toBe('');
  });

  it('lists articles and forwards events', () => {
    const wrapper = mountResults({
      searchQuery: 'bill',
      articles: [{ id: 3, title: 'Billing', category: { name: 'Docs' } }],
    });
    const item = wrapper.findComponent(ItemStub);
    expect(item.props('category')).toBe('Docs');
    item.vm.$emit('preview', 3);
    item.vm.$emit('insert', 3);
    expect(wrapper.emitted('preview')).toEqual([[3]]);
    expect(wrapper.emitted('insert')).toEqual([[3]]);
  });
});
