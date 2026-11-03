/**
 * OneTeam behaviour spec for the help center categories empty state.
 *
 * Covers passing the title and subtitle to the layout and rendering the
 * sample categories in two columns, the second in reverse order, with
 * a zero article count when a sample has none.
 */
import { mount } from '@vue/test-utils';
import CategoryEmptyState from '../CategoryEmptyState.vue';

vi.mock('../categoryEmptyStateContent.js', () => ({
  default: [
    { id: 1, name: 'Billing', slug: 'billing', meta: { articles_count: 4 } },
    { id: 2, name: 'Setup', slug: 'setup', meta: {} },
  ],
}));

const EmptyStateLayout = {
  name: 'EmptyStateLayout',
  props: ['title', 'subtitle'],
  template: '<div><slot name="empty-state-item" /></div>',
};
const CategoryCard = {
  name: 'CategoryCard',
  props: ['id', 'title', 'articlesCount', 'slug'],
  template: '<div class="card" />',
};

describe('CategoryEmptyState behaviour', () => {
  it('renders the sample categories in two columns', () => {
    const wrapper = mount(CategoryEmptyState, {
      props: { title: 'No categories', subtitle: 'Add one' },
      global: { stubs: { EmptyStateLayout, CategoryCard } },
    });
    expect(wrapper.getComponent(EmptyStateLayout).props()).toEqual({
      title: 'No categories',
      subtitle: 'Add one',
    });
    const cards = wrapper.findAllComponents(CategoryCard);
    expect(cards.map(card => card.props('id'))).toEqual([1, 2, 2, 1]);
    expect(cards[0].props()).toMatchObject({
      title: 'Billing',
      articlesCount: 4,
      slug: 'billing',
    });
    expect(cards[1].props('articlesCount')).toBe(0);
  });
});
