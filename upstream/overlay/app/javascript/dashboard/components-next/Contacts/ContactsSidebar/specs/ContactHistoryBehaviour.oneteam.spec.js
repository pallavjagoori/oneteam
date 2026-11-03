/**
 * OneTeam behaviour spec for a contact's conversation history.
 *
 * Covers the loading spinner, one card per conversation with its
 * contact, inbox and labels, and the empty state.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import ContactHistory from '../ContactHistory.vue';

const env = vi.hoisted(() => ({ fetching: false, conversations: [] }));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { contactId: 7 } }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name =>
    computed(
      () =>
        ({
          'contactConversations/getAllConversationsByContactId': id =>
            id === 7 ? env.conversations : [],
          'contacts/getContactById': id => ({ id, name: `contact-${id}` }),
          'inboxes/getInboxById': id => ({ id, name: `inbox-${id}` }),
          'labels/getLabels': [{ title: 'vip' }],
          'contactConversations/getUIFlags': { isFetching: env.fetching },
        })[name]
    ),
}));

const ConversationCard = {
  name: 'ConversationCard',
  props: ['conversation', 'contact', 'stateInbox', 'accountLabels'],
  template: '<div class="card" />',
};
const Spinner = { name: 'Spinner', template: '<span class="spinner" />' };

/**
 * Mounts the history list.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountHistory = () =>
  mount(ContactHistory, { global: { stubs: { ConversationCard, Spinner } } });

describe('ContactHistory behaviour', () => {
  it('shows a spinner while loading', () => {
    env.fetching = true;
    expect(mountHistory().find('.spinner').exists()).toBe(true);
    env.fetching = false;
  });

  it('lists conversations with their contact, inbox and labels', () => {
    env.conversations = [{ id: 1, inboxId: 3, meta: { sender: { id: 9 } } }];
    const card = mountHistory().getComponent(ConversationCard);
    expect(card.props()).toEqual({
      conversation: env.conversations[0],
      contact: { id: 9, name: 'contact-9' },
      stateInbox: { id: 3, name: 'inbox-3' },
      accountLabels: [{ title: 'vip' }],
    });
  });

  it('shows the empty state', () => {
    env.conversations = [];
    expect(mountHistory().text()).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.HISTORY.EMPTY_STATE'
    );
  });
});
