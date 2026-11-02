/**
 * OneTeam behaviour spec for a notification card in the inbox view.
 *
 * Covers the message line (sender name emphasised, a leading ": "
 * dropped, an unread dot), the notification type label and colour (or
 * none), snoozed and snooze-ended labels, the SLA label and divider,
 * priority and inbox icons, clicking, and the right-click menu
 * (mark as read or unread, delete, closing it).
 */
import { mount } from '@vue/test-utils';
import InboxCard from '../InboxCard.vue';

const env = vi.hoisted(() => ({ icon: 'i-woot-website', sla: false }));

vi.mock('dashboard/helper/inbox', async importOriginal => ({
  ...(await importOriginal()),
  getInboxIconByType: () => env.icon,
}));

const InboxContextMenu = {
  name: 'InboxContextMenu',
  props: ['contextMenuPosition', 'menuItems'],
  emits: ['close', 'selectAction'],
  template: '<div class="menu" />',
};
const SLACardLabel = {
  name: 'SLACardLabel',
  props: ['conversation'],
  data: () => ({ hasSlaThreshold: env.sla }),
  template: '<div class="sla" />',
};

const item = (extra = {}) => ({
  id: 1,
  pushMessageBody: 'Ann: Need help',
  notificationType: 'conversation_mention',
  lastActivityAt: 1_772_618_400,
  primaryActor: {
    priority: 'high',
    slaPolicyId: 3,
    meta: { sender: { name: 'Ann', thumbnail: 'ann.png' } },
  },
  meta: {},
  ...extra,
});

const mountCard = (inboxItem = item(), stateInbox = { name: 'Site' }) =>
  mount(InboxCard, {
    props: { inboxItem, stateInbox },
    global: {
      directives: {
        tooltip: {},
        dompurifyHtml: (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
      stubs: {
        InboxContextMenu,
        SLACardLabel,
        Avatar: { props: ['name'], template: '<i class="avatar" />' },
        CardPriorityIcon: {
          props: ['priority'],
          template: '<i class="priority" />',
        },
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
      },
    },
  });

const message = wrapper => wrapper.find('p');

describe('InboxCard behaviour', () => {
  beforeEach(() => {
    env.icon = 'i-woot-website';
    env.sla = false;
  });

  it('shows an unread mention with its details', async () => {
    const wrapper = mountCard();
    expect(message(wrapper).find('.bg-n-iris-10').exists()).toBe(true);
    expect(message(wrapper).find('.font-medium.text-n-slate-12').text()).toBe(
      'Ann:'
    );
    expect(message(wrapper).text()).toContain('Need help');
    expect(wrapper.find('.i-lucide-at-sign').classes()).toContain(
      'text-n-blue-11'
    );
    expect(wrapper.text()).toContain('INBOX.TYPES_NEXT.CONVERSATION_MENTION');
    expect(wrapper.find('.priority').exists()).toBe(true);
    expect(wrapper.find('.i-woot-website').exists()).toBe(true);
    expect(wrapper.find('.sla').isVisible()).toBe(false);
    expect(wrapper.find('.text-xs.text-n-slate-10').text()).not.toBe('');

    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('shows a read message plainly and drops a leading colon', () => {
    const wrapper = mountCard(
      item({
        readAt: 1,
        pushMessageBody: ': Hello there',
        notificationType: 'sla_missed_first_response',
        lastActivityAt: null,
        primaryActor: { meta: { sender: {} } },
      })
    );
    expect(message(wrapper).find('.bg-n-iris-10').exists()).toBe(false);
    expect(message(wrapper).text()).toBe('Hello there');
    expect(message(wrapper).find('span').classes()).toContain('font-normal');
    expect(wrapper.find('.i-lucide-heart-crack').classes()).toContain(
      'text-n-slate-11'
    );
    expect(wrapper.find('.priority').exists()).toBe(false);
    expect(wrapper.find('.text-xs.text-n-slate-10').text()).toBe('');
  });

  it('handles unknown and missing notification types', () => {
    const unknown = mountCard(
      item({ notificationType: 'brand_new', pushMessageBody: null })
    );
    expect(unknown.text()).toContain('INBOX.TYPES_NEXT.BRAND_NEW');
    expect(unknown.find('.text-n-blue-11').exists()).toBe(true);
    env.icon = '';
    const none = mountCard(item({ notificationType: null }));
    expect(none.text()).not.toContain('INBOX.TYPES_NEXT');
    expect(none.find('.bg-n-alpha-2').exists()).toBe(false);
  });

  it('shows snoozed and snooze-ended labels', () => {
    const snoozed = mountCard(item({ snoozedUntil: '2030-01-01T10:00:00Z' }));
    expect(snoozed.find('.i-lucide-alarm-clock-plus').classes()).toContain(
      'text-n-blue-11'
    );
    expect(snoozed.text()).toContain('INBOX.TYPES_NEXT.SNOOZED_UNTIL');
    const ended = mountCard(item({ readAt: 1, meta: { lastSnoozedAt: 5 } }));
    expect(ended.find('.i-lucide-alarm-clock-off').classes()).toContain(
      'text-n-slate-11'
    );
    expect(ended.text()).toContain('INBOX.TYPES_NEXT.SNOOZED_ENDS');
  });

  it('shows the SLA label when a threshold applies', async () => {
    env.sla = true;
    const wrapper = mountCard(item({ readAt: 1 }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.sla').isVisible()).toBe(true);
    expect(wrapper.find('.bg-n-slate-4').exists()).toBe(true);
    expect(wrapper.find('.sla').classes()).toContain(
      '[&>span]:text-n-slate-11'
    );
  });

  it('opens the context menu and runs its actions', async () => {
    const inboxItem = item();
    const wrapper = mountCard(inboxItem);
    await wrapper.trigger('contextmenu', { clientX: 10, clientY: 20 });
    expect(wrapper.emitted('contextMenuOpen')).toHaveLength(1);
    const menu = wrapper.findComponent(InboxContextMenu);
    expect(menu.props('contextMenuPosition')).toEqual({ x: 10, y: 20 });
    expect(menu.props('menuItems').map(i => i.key)).toEqual([
      'mark_as_read',
      'delete',
    ]);

    menu.vm.$emit('selectAction', 'mark_as_read');
    menu.vm.$emit('selectAction', 'delete');
    menu.vm.$emit('selectAction', 'unknown');
    expect(wrapper.emitted('markNotificationAsRead')[0]).toEqual([inboxItem]);
    expect(wrapper.emitted('deleteNotification')[0]).toEqual([inboxItem]);
    await menu.vm.$emit('close');
    expect(wrapper.findComponent(InboxContextMenu).exists()).toBe(false);
    expect(wrapper.emitted('contextMenuClose')).toHaveLength(2);

    const read = mountCard(item({ readAt: 1 }));
    await read.trigger('contextmenu', { pageX: 5, pageY: 6 });
    const readMenu = read.findComponent(InboxContextMenu);
    expect(readMenu.props('menuItems')[0].key).toBe('mark_as_unread');
    readMenu.vm.$emit('selectAction', 'mark_as_unread');
    expect(read.emitted('markNotificationAsUnRead')).toHaveLength(1);
  });
});
