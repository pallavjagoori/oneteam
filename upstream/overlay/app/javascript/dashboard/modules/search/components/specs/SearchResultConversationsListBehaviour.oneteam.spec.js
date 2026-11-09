/**
 * OneTeam behaviour spec for the search conversation results.
 *
 * Covers listing each conversation with its contact, account and mail
 * subject (empty when missing), and the empty state.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import SearchResultConversationsList from '../SearchResultConversationsList.vue';

vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => computed(() => 2),
}));

/**
 * Mounts the list.
 *
 * @param {object[]} conversations results shown
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountList = conversations =>
  mount(SearchResultConversationsList, {
    props: { conversations, query: 'q' },
    global: {
      mocks: { $t: key => key },
      stubs: {
        SearchResultSection: {
          name: 'SearchResultSection',
          props: { empty: Boolean },
          template: '<section><slot /></section>',
        },
        SearchResultConversationItem: {
          name: 'SearchResultConversationItem',
          props: ['id', 'name', 'email', 'accountId', 'emailSubject'],
          template: '<div />',
        },
      },
    },
  });

describe('SearchResultConversationsList behaviour', () => {
  it('lists conversations with their mail subject', () => {
    const wrapper = mountList([
      {
        id: 1,
        contact: { name: 'Ann', email: 'a@b.c' },
        additionalAttributes: { mailSubject: 'Refund' },
      },
      { id: 2, contact: { name: 'Bob' } },
    ]);
    const items = wrapper.findAllComponents({
      name: 'SearchResultConversationItem',
    });
    expect(items.map(item => item.props('emailSubject'))).toEqual([
      'Refund',
      '',
    ]);
    expect(items[0].props()).toMatchObject({
      id: 1,
      name: 'Ann',
      accountId: 2,
    });
    expect(
      wrapper.findComponent({ name: 'SearchResultSection' }).props('empty')
    ).toBe(false);
  });

  it('marks the section empty without results', () => {
    const wrapper = mountList([]);
    expect(
      wrapper.findComponent({ name: 'SearchResultSection' }).props('empty')
    ).toBe(true);
    expect(wrapper.find('ul').exists()).toBe(false);
  });
});
