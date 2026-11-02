/**
 * OneTeam behaviour spec for the company notes feed.
 *
 * Covers the loading and empty states, grouping notes by day, author
 * labels and avatars (you, an agent, the system), expanding and
 * collapsing long notes, highlighting search matches outside markup,
 * opening the linked contact, and loading more notes.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import CompanyNotesFeed from '../CompanyNotesFeed.vue';

const push = vi.fn();

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ accountId: ref(2) }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ref({ id: 7 }),
}));
vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({
    formatMessage: text => `<p class="cat">${text}</p>`,
  }),
}));

const Avatar = {
  name: 'Avatar',
  props: ['name', 'src', 'iconName'],
  template: '<i class="avatar" />',
};
const Button = {
  name: 'Button',
  props: ['label', 'isLoading'],
  emits: ['click'],
  template:
    '<button class="more" @click="$emit(\'click\')">{{ label }}</button>',
};

const now = Math.floor(Date.now() / 1000);
const longText = 'cat '.repeat(70);
const notes = [
  {
    id: 1,
    content: 'Cat food',
    createdAt: now,
    user: { id: 7, thumbnail: 'me.png' },
    contact: { id: 11, name: 'Ann' },
  },
  {
    id: 2,
    content: longText,
    createdAt: now,
    user: { id: 8, name: 'Lee' },
    contact: { id: 12 },
  },
  { id: 3, createdAt: now - 86400 * 10 },
  { id: 4, createdAt: now - 86400 * 10, user: { id: 9 } },
];

const mountFeed = (props = {}) =>
  mount(CompanyNotesFeed, {
    props: { emptyMessage: 'Nothing yet', notes, ...props },
    global: {
      stubs: { Avatar, Button, Spinner: { template: '<i class="spin" />' } },
      directives: {
        dompurifyHtml: (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
    },
  });

describe('CompanyNotesFeed behaviour', () => {
  it('shows the loading and empty states', () => {
    let wrapper = mountFeed({ notes: [], isLoading: true, hasMore: true });
    expect(wrapper.find('.spin').exists()).toBe(true);
    expect(wrapper.find('.more').exists()).toBe(false);
    wrapper = mountFeed({ notes: [] });
    expect(wrapper.text()).toBe('Nothing yet');
  });

  it('groups notes by day with authors and avatars', () => {
    const wrapper = mountFeed();
    expect(wrapper.findAll('h3').map(h => h.text())[0]).toBe(
      'COMPANIES.DETAIL.ACTIVITY.TODAY'
    );
    expect(wrapper.findAll('h3')).toHaveLength(2);
    const avatars = wrapper.findAllComponents(Avatar);
    expect(
      avatars.map(a => [a.props('name'), a.props('src'), a.props('iconName')])
    ).toEqual([
      ['CONTACTS_LAYOUT.SIDEBAR.NOTES.YOU', 'me.png', null],
      ['Lee', undefined, null],
      [
        'COMPANIES.DETAIL.ACTIVITY.SYSTEM_AUTHOR',
        undefined,
        'i-lucide-settings',
      ],
      ['COMPANIES.DETAIL.ACTIVITY.SYSTEM_AUTHOR', undefined, null],
    ]);
    expect(wrapper.find('.cat').text()).toBe('Cat food');
  });

  it('expands and collapses long notes', async () => {
    const wrapper = mountFeed();
    const toggle = wrapper.find('li:nth-child(2) button.self-start');
    expect(toggle.text()).toBe('COMPANIES.DETAIL.HEADER.MORE');
    const body = wrapper.findAll('[class*="line-clamp"], .text-body-main')[1];
    expect(body.classes()).toContain('line-clamp-3');
    await toggle.trigger('click');
    expect(toggle.text()).toBe('COMPANIES.DETAIL.HEADER.LESS');
    expect(body.classes()).not.toContain('line-clamp-3');
    await toggle.trigger('click');
    expect(toggle.text()).toBe('COMPANIES.DETAIL.HEADER.MORE');
  });

  it('highlights matches without touching markup', () => {
    const wrapper = mountFeed({ highlight: ' cat ' });
    const first = wrapper.find('.cat');
    expect(first.html()).toContain('<mark>Cat</mark> food');
    expect(wrapper.html()).not.toContain('<p class="<mark>');
    expect(wrapper.findAll('button.self-start')).toHaveLength(0);
    expect(wrapper.find('.line-clamp-3').exists()).toBe(false);
  });

  it('opens contacts and loads more', async () => {
    const wrapper = mountFeed({ hasMore: true, isLoading: true });
    const contacts = wrapper.findAll('button.hover\\:underline');
    expect(contacts.map(c => c.text())).toEqual([
      'Ann',
      'COMPANIES.DETAIL.CONTACTS.UNNAMED_CONTACT',
    ]);
    await contacts[0].trigger('click');
    expect(push).toHaveBeenCalledWith({
      name: 'contacts_edit',
      params: { accountId: 2, contactId: 11 },
    });
    const more = wrapper.findComponent(Button);
    expect(more.props('isLoading')).toBe(true);
    await more.trigger('click');
    expect(wrapper.emitted('loadMore')).toHaveLength(1);
  });
});
