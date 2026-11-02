/**
 * OneTeam behaviour spec for a company's conversation list.
 *
 * Covers the loading spinner, the empty and no-match messages,
 * conversations grouped by day with their contact (stored contact,
 * sender, or none), assignee and inbox, opening a conversation in the
 * app or in a new tab with Cmd/Ctrl, and loading more.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import CompanyConversationList from '../CompanyConversationList.vue';

const env = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { ref: vueRef } = await import('vue');
  return { useAccount: () => ({ accountId: vueRef(1) }) };
});
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name =>
    name === 'contacts/getContact' ? env.contactById : env.inboxById,
}));
vi.mock('dashboard/components-next/Companies/helpers/companyHelper', () => ({
  groupByDay: items => [
    { label: 'Today', items: items.slice(0, 2) },
    { label: 'Yesterday', items: items.slice(2) },
  ],
}));

const Card = {
  name: 'ConversationCardExpanded',
  props: ['chat', 'currentContact', 'assignee', 'inbox'],
  emits: ['click'],
  template:
    '<article @click="$emit(\'click\', $event)">{{ chat.id }}</article>',
};
const Button = {
  name: 'Button',
  props: { label: String, isLoading: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const conversations = [
  {
    id: 9,
    inbox_id: 2,
    meta: { sender: { id: 4, name: 'Old Ann' }, assignee: { id: 7 } },
  },
  { id: 10, inbox_id: 3, meta: { sender: { id: 5, name: 'Bo' } } },
  { id: 11, inbox_id: 3 },
];

const mountList = props => {
  env.contactById = ref(id => (id === 4 ? { id: 4, name: 'Ann' } : {}));
  env.inboxById = ref(id => (id === 2 ? { id: 2, name: 'Mail' } : undefined));
  return mount(CompanyConversationList, {
    props,
    global: {
      stubs: {
        ConversationCardExpanded: Card,
        Button,
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });
};

const cards = wrapper => wrapper.findAllComponents(Card);

describe('CompanyConversationList behaviour', () => {
  it('shows a spinner or the empty messages', () => {
    const loading = mountList({ isLoading: true, hasMore: true });
    expect(loading.find('.spinner').exists()).toBe(true);
    expect(loading.find('button').exists()).toBe(false);

    expect(mountList({}).find('p').text()).toBe(
      'COMPANIES.DETAIL.ACTIVITY.EMPTY_CONVERSATIONS'
    );
    expect(mountList({ filtered: true }).find('p').text()).toBe(
      'COMPANIES.DETAIL.ACTIVITY.NO_MATCHING_CONVERSATIONS'
    );
  });

  it('groups conversations by day with their contact, assignee and inbox', () => {
    const wrapper = mountList({ conversations, isLoading: true });
    expect(wrapper.find('.spinner').exists()).toBe(false);
    expect(wrapper.findAll('h3').map(h => h.text())).toEqual([
      'Today',
      'Yesterday',
    ]);
    expect(
      cards(wrapper).map(c => [
        c.props('currentContact'),
        c.props('assignee'),
        c.props('inbox'),
      ])
    ).toEqual([
      [{ id: 4, name: 'Ann' }, { id: 7 }, { id: 2, name: 'Mail' }],
      [{ id: 5, name: 'Bo' }, {}, {}],
      [{}, {}, {}],
    ]);
  });

  it('opens a conversation here or in a new tab', async () => {
    window.chatwootConfig = { hostURL: 'https://chat.acme.io' };
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mountList({ conversations });
    await cards(wrapper)[0].trigger('click');
    expect(env.push).toHaveBeenCalledWith({
      path: '/app/accounts/1/conversations/9',
    });

    await cards(wrapper)[1].trigger('click', { metaKey: true });
    await cards(wrapper)[2].trigger('click', { ctrlKey: true });
    expect(open).toHaveBeenCalledWith(
      'https://chat.acme.io/app/accounts/1/conversations/10',
      '_blank',
      'noopener,noreferrer'
    );
    expect(open).toHaveBeenCalledTimes(2);
    expect(env.push).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });

  it('loads more conversations', async () => {
    const wrapper = mountList({
      conversations,
      hasMore: true,
      isLoading: true,
    });
    const more = wrapper.findComponent(Button);
    expect(more.props()).toEqual({
      label: 'COMPANIES.DETAIL.ACTIVITY.LOAD_MORE',
      isLoading: true,
    });
    await more.trigger('click');
    expect(wrapper.emitted('loadMore')).toHaveLength(1);
  });
});
