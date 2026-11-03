/**
 * OneTeam behaviour spec for a conversation search result card.
 *
 * Covers the link with and without a message anchor, the inbox name and
 * channel icon (including inboxes the store does not know and a missing
 * inbox), the relative creation time, and the sender, email and subject
 * details with separators between them.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import SearchResultConversationItem from '../SearchResultConversationItem.vue';

const env = vi.hoisted(() => ({ inbox: null, ids: [] }));

vi.mock('dashboard/composables/useInbox', () => ({
  useInbox: id => {
    env.ids.push(id);
    return { inbox: ref(env.inbox) };
  },
}));
vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: time => `ago ${time}`,
}));

const mountItem = props =>
  mount(SearchResultConversationItem, {
    props,
    global: {
      stubs: {
        'router-link': {
          props: ['to'],
          template: '<a :href="to"><slot /></a>',
        },
        CardLayout: { template: '<div><slot /></div>' },
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
      },
      directives: { tooltip: {} },
    },
  });

describe('SearchResultConversationItem behaviour', () => {
  beforeEach(() => {
    env.inbox = null;
    env.ids = [];
  });

  it('shows every detail for a known inbox', () => {
    env.inbox = { channelType: 'Channel::Email', medium: '' };
    const wrapper = mountItem({
      id: 12,
      accountId: 1,
      messageId: 99,
      inbox: { id: 3, name: 'Support' },
      name: 'Ada',
      email: 'ada@x.io',
      emailSubject: 'Refund',
      createdAt: 1700,
    });
    expect(wrapper.find('a').attributes('href')).toBe(
      '/app/accounts/1/conversations/12?messageId=99'
    );
    expect(env.ids).toEqual([3]);
    expect(wrapper.text()).toContain('Support');
    expect(wrapper.findAll('i')).toHaveLength(2);
    expect(wrapper.text()).toContain('ago 1700');
    expect(wrapper.findAll('h5')).toHaveLength(3);
    expect(wrapper.findAll('.w-px')).toHaveLength(3);
  });

  it('handles a bare result', () => {
    const wrapper = mountItem({ id: 5, accountId: 1, inbox: null });
    expect(env.ids).toEqual([undefined]);
    expect(wrapper.find('a').attributes('href')).toBe(
      '/app/accounts/1/conversations/5?'
    );
    expect(wrapper.findAll('h5')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('ago');

    const unknown = mountItem({ inbox: { id: 8, name: 'Old' }, name: 'Bo' });
    expect(unknown.text()).toContain('Old');
    expect(unknown.findAll('i')).toHaveLength(1);
    expect(unknown.findAll('h5')).toHaveLength(1);
  });
});
