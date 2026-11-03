/**
 * OneTeam behaviour spec for the classic conversation list card.
 *
 * Covers the click and context menu events, the hover checkbox on the
 * avatar (select and deselect, hidden thumbnails, reset when the chat
 * changes), the meta row (inbox name, human assignee, priority), unread
 * styling in normal and compact mode, the voice call, message preview
 * and no messages rows, and the SLA label inside the labels row.
 */
import { shallowMount } from '@vue/test-utils';
import ConversationCard from '../ConversationCard.vue';

const Avatar = {
  name: 'Avatar',
  props: ['name', 'size'],
  template: '<div class="avatar"><slot name="overlay" :size="size" /></div>',
};
const Checkbox = {
  name: 'Checkbox',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input type="checkbox" class="check" />',
};
const CardLabels = {
  name: 'CardLabels',
  template: '<div class="labels"><slot name="before" /></div>',
};

const baseChat = {
  id: 1,
  labels: [],
  messages: [],
  priority: null,
  unread_count: 0,
  timestamp: 1,
  created_at: 1,
};
const mountCard = (chat = {}, props = {}) =>
  shallowMount(ConversationCard, {
    props: {
      chat: { ...baseChat, ...chat },
      currentContact: { name: 'Jane' },
      inbox: { id: 9 },
      ...props,
    },
    global: {
      stubs: { 'fluent-icon': true, Avatar, Checkbox, CardLabels },
    },
  });

describe('Classic ConversationCard behaviour', () => {
  it('emits click and context menu events', async () => {
    const wrapper = mountCard({}, { isActiveChat: true, compact: true });
    await wrapper.trigger('click');
    await wrapper.trigger('contextmenu');
    expect(wrapper.emitted('click')).toHaveLength(1);
    expect(wrapper.emitted('contextmenu')).toHaveLength(1);
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['active', 'px-0'])
    );
  });

  it('selects and deselects from the hover checkbox', async () => {
    const wrapper = mountCard();
    const thumb = wrapper.find('[class="relative"]');
    expect(wrapper.find('.check').exists()).toBe(false);
    await thumb.trigger('mouseenter');
    const label = wrapper.find('label');
    expect(label.attributes('style')).toContain('width: 32px');
    await label.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();

    const box = wrapper.findComponent(Checkbox);
    await box.vm.$emit('update:modelValue', true);
    await box.vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('selectConversation')).toEqual([[1, 9]]);
    expect(wrapper.emitted('deSelectConversation')).toEqual([[1, 9]]);

    await thumb.trigger('mouseleave');
    expect(wrapper.find('.check').exists()).toBe(false);
    await thumb.trigger('mouseenter');
    await wrapper.setProps({ chat: { ...baseChat, id: 2 } });
    expect(wrapper.find('.check').exists()).toBe(false);

    await wrapper.setProps({ selected: true });
    expect(wrapper.findComponent(Checkbox).props('modelValue')).toBe(true);
  });

  it('keeps the checkbox hidden when thumbnails are hidden', async () => {
    const wrapper = mountCard({}, { hideThumbnail: true });
    await wrapper.find('[class="relative"]').trigger('mouseenter');
    expect(wrapper.find('.avatar').exists()).toBe(false);
  });

  it('shows the inbox, a human assignee and the priority', () => {
    const wrapper = mountCard(
      { priority: 'high' },
      { showInboxName: true, showAssignee: true, assignee: { name: 'Sam' } }
    );
    expect(wrapper.findComponent({ name: 'InboxName' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'Icon' }).props('icon')).toBe(
      'i-lucide-user-round'
    );
    expect(wrapper.text()).toContain('Sam');

    const priorityOnly = mountCard({ priority: 'low' }, { compact: true });
    expect(
      priorityOnly.findComponent({ name: 'CardPriorityIcon' }).exists()
    ).toBe(true);
    expect(priorityOnly.findComponent({ name: 'InboxName' }).exists()).toBe(
      false
    );
  });

  it('styles unread previews in normal and compact mode', () => {
    const message = { id: 1, content: 'Hi', message_type: 0 };
    const unread = mountCard({ unread_count: 2, messages: [message] });
    const preview = unread.findComponent({ name: 'MessagePreview' });
    expect(preview.classes()).toEqual(
      expect.arrayContaining(['font-medium', 'ltr:pr-4'])
    );
    expect(unread.findComponent({ name: 'UnreadBadge' }).props('count')).toBe(
      2
    );
    expect(unread.find('h4').classes()).toContain('font-semibold');

    const compact = mountCard(
      { unread_count: 1, messages: [message] },
      { compact: true }
    );
    expect(
      compact.findComponent({ name: 'MessagePreview' }).classes()
    ).toContain('ltr:pr-6');
  });

  it('shows voice call rows for both directions', () => {
    const call = direction => ({
      messages: [
        {
          id: 1,
          message_type: 0,
          content_type: 'voice_call',
          call: { status: 'ringing', direction },
        },
      ],
    });
    const outbound = mountCard(call('outgoing'));
    expect(
      outbound.findComponent({ name: 'VoiceCallStatus' }).props()
    ).toMatchObject({ status: 'ringing', direction: 'outbound' });
    expect(
      mountCard(call('incoming'))
        .findComponent({ name: 'VoiceCallStatus' })
        .props('direction')
    ).toBe('inbound');

    const noCall = mountCard({
      messages: [{ id: 1, message_type: 0, content_type: 'voice_call' }],
    });
    expect(noCall.findComponent({ name: 'VoiceCallStatus' }).exists()).toBe(
      false
    );
    expect(noCall.findComponent({ name: 'MessagePreview' }).exists()).toBe(
      true
    );
  });

  it('shows no messages and the SLA label', () => {
    const wrapper = mountCard({ applied_sla: { id: 3 }, labels: ['vip'] });
    expect(wrapper.text()).toContain('CHAT_LIST.NO_MESSAGES');
    expect(wrapper.findComponent({ name: 'SLACardLabel' }).exists()).toBe(true);
    const labelsOnly = mountCard({ labels: ['vip'] });
    expect(labelsOnly.find('.labels').exists()).toBe(true);
    expect(labelsOnly.findComponent({ name: 'SLACardLabel' }).exists()).toBe(
      false
    );
  });
});
