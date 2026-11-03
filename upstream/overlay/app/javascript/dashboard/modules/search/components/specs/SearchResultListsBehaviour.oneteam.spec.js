/**
 * OneTeam behaviour spec for the article and contact search result lists.
 *
 * Covers mapping each record onto its item with the current account, and
 * the empty section when there are no records.
 */
import { mount } from '@vue/test-utils';
import SearchResultArticlesList from '../SearchResultArticlesList.vue';
import SearchResultContactsList from '../SearchResultContactsList.vue';

vi.mock('dashboard/composables/store.js', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: () => computed(() => 3) };
});

const Section = {
  name: 'SearchResultSection',
  props: ['empty', 'query'],
  template: '<section :data-empty="empty"><slot /></section>',
};
const item = name => ({
  name,
  props: ['id', 'title', 'name', 'phone', 'category', 'accountId', 'updatedAt'],
  template: '<div class="item" />',
});
const ArticleItem = item('SearchResultArticleItem');
const ContactItem = item('SearchResultContactItem');
const global = {
  stubs: {
    SearchResultSection: Section,
    SearchResultArticleItem: ArticleItem,
    SearchResultContactItem: ContactItem,
  },
  mocks: { $t: key => key },
};

describe('Search result lists', () => {
  it('maps articles onto items', () => {
    const wrapper = mount(SearchResultArticlesList, {
      props: {
        query: 'bill',
        articles: [
          { id: 1, title: 'Billing', categoryName: 'Payments', updatedAt: 9 },
        ],
      },
      global,
    });
    expect(wrapper.find('section').attributes('data-empty')).toBe('false');
    expect(wrapper.getComponent(ArticleItem).props()).toMatchObject({
      id: 1,
      title: 'Billing',
      category: 'Payments',
      accountId: 3,
      updatedAt: 9,
    });
  });

  it('maps contacts onto items', () => {
    const wrapper = mount(SearchResultContactsList, {
      props: {
        contacts: [
          { id: 2, name: 'Ann', phoneNumber: '+1', lastActivityAt: 8 },
        ],
      },
      global,
    });
    expect(wrapper.getComponent(ContactItem).props()).toMatchObject({
      id: 2,
      name: 'Ann',
      phone: '+1',
      accountId: 3,
      updatedAt: 8,
    });
  });

  it('renders empty sections without records', () => {
    [SearchResultArticlesList, SearchResultContactsList].forEach(List => {
      const wrapper = mount(List, { global });
      expect(wrapper.find('section').attributes('data-empty')).toBe('true');
      expect(wrapper.find('.item').exists()).toBe(false);
    });
  });
});
