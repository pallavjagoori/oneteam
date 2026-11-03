/**
 * OneTeam behaviour spec for the message search results section.
 *
 * Covers the section state, one result per message with its link
 * details, naming the author or falling back to the bot label, and the
 * empty state.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import SearchResultMessagesList from '../SearchResultMessagesList.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => computed(() => 8),
}));

const SearchResultSection = {
  name: 'SearchResultSection',
  props: {
    empty: Boolean,
    query: String,
    showTitle: Boolean,
    isFetching: Boolean,
  },
  template: '<section><slot /></section>',
};
const SearchResultMessageItem = {
  name: 'SearchResultMessageItem',
  props: ['id', 'accountId', 'inboxId', 'messageId', 'isPrivate'],
  template: '<div><slot /></div>',
};
const MessageContent = {
  name: 'MessageContent',
  props: ['author', 'searchTerm'],
  template: '<span />',
};

/**
 * Mounts the section.
 *
 * @param {object} props Section props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountList = props =>
  mount(SearchResultMessagesList, {
    props,
    global: {
      stubs: { SearchResultSection, SearchResultMessageItem, MessageContent },
      mocks: { $t: key => key },
    },
  });

describe('SearchResultMessagesList behaviour', () => {
  it('lists messages with their authors', () => {
    const wrapper = mountList({
      query: 'refund',
      isFetching: true,
      messages: [
        {
          id: 11,
          conversationId: 3,
          inboxId: 2,
          private: true,
          sender: { name: 'Ann' },
        },
        { id: 12, conversationId: 4, sender: {} },
        { id: 13, conversationId: 5 },
      ],
    });
    expect(wrapper.getComponent(SearchResultSection).props()).toMatchObject({
      empty: false,
      query: 'refund',
      showTitle: true,
      isFetching: true,
    });
    expect(wrapper.getComponent(SearchResultMessageItem).props()).toMatchObject(
      {
        id: 3,
        accountId: 8,
        inboxId: 2,
        messageId: 11,
        isPrivate: true,
      }
    );
    expect(
      wrapper.findAllComponents(MessageContent).map(c => c.props('author'))
    ).toEqual(['Ann', 'SEARCH.BOT_LABEL', 'SEARCH.BOT_LABEL']);
    expect(wrapper.vm.$.setupState.getName(null)).toBe('SEARCH.BOT_LABEL');
  });

  it('shows the empty section', () => {
    const wrapper = mountList({ showTitle: false });
    expect(wrapper.getComponent(SearchResultSection).props('empty')).toBe(true);
    expect(wrapper.find('ul').exists()).toBe(false);
  });
});
