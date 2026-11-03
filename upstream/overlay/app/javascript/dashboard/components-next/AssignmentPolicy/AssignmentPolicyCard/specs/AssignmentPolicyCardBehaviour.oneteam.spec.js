/**
 * OneTeam behaviour spec for an assignment policy card.
 *
 * Covers the name, description, title-cased order and priority (and
 * hiding them when empty), mapping inboxes to icons for the popover,
 * fetching inboxes only when none are loaded, and the edit and delete
 * buttons.
 */
import { mount } from '@vue/test-utils';
import AssignmentPolicyCard from '../AssignmentPolicyCard.vue';

const CardPopover = {
  name: 'CardPopover',
  props: ['items', 'count', 'isFetching'],
  emits: ['fetch'],
  template: '<div class="popover" />',
};
const Button = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const mountCard = props =>
  mount(AssignmentPolicyCard, {
    props: { id: 7, ...props },
    global: {
      stubs: {
        CardPopover,
        Button,
        CardLayout: { template: '<section><slot /></section>' },
      },
    },
  });

describe('AssignmentPolicyCard behaviour', () => {
  it('shows details and maps inboxes', () => {
    const wrapper = mountCard({
      name: 'Round robin',
      description: 'Even split',
      assignmentOrder: 'round_robin',
      conversationPriority: 'longest_waiting',
      assignedInboxCount: 1,
      isFetchingInboxes: true,
      inboxes: [{ id: 1, name: 'Web', channelType: 'Channel::WebWidget' }],
    });
    expect(wrapper.find('h3').text()).toBe('Round robin');
    expect(wrapper.text()).toContain('Even split');
    expect(wrapper.text()).toContain('Round Robin');
    expect(wrapper.text()).toContain('Longest Waiting');
    const popover = wrapper.findComponent(CardPopover);
    expect(popover.props()).toMatchObject({ count: 1, isFetching: true });
    expect(popover.props('items')).toEqual([
      { id: 1, name: 'Web', icon: expect.any(String) },
    ]);
    popover.vm.$emit('fetch');
    expect(wrapper.emitted('fetchInboxes')).toBeUndefined();
  });

  it('hides empty order and priority, fetches inboxes, edits and deletes', async () => {
    const wrapper = mountCard();
    expect(wrapper.text()).not.toContain('INDEX.CARD.ORDER');
    expect(wrapper.text()).not.toContain('INDEX.CARD.PRIORITY');
    expect(wrapper.find('.w-px').exists()).toBe(false);
    wrapper.findComponent(CardPopover).vm.$emit('fetch');
    expect(wrapper.emitted('fetchInboxes')).toEqual([[7]]);
    const [edit, remove] = wrapper.findAll('button');
    await edit.trigger('click');
    await remove.trigger('click');
    expect(wrapper.emitted('edit')).toEqual([[7]]);
    expect(wrapper.emitted('delete')).toEqual([[7]]);
  });
});
