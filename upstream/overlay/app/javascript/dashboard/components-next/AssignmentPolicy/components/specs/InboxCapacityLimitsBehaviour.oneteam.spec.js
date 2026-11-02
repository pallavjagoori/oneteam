/**
 * OneTeam behaviour spec for the capacity policy's per-inbox limits.
 *
 * Covers the loading spinner and empty state, offering only inboxes
 * without a limit, adding an inbox with the default limit of 10, each
 * limit row with its inbox name, saving a valid limit on blur, flagging
 * and not saving invalid limits (negative, too large, not a whole
 * number), and deleting a limit.
 */
import { mount } from '@vue/test-utils';
import InboxCapacityLimits from '../InboxCapacityLimits.vue';

const AddDataDropdown = {
  name: 'AddDataDropdown',
  props: ['label', 'items'],
  emits: ['add'],
  template: '<div class="add" />',
};
const Button = {
  name: 'Button',
  props: ['icon'],
  emits: ['click'],
  template: '<button class="delete" @click="$emit(\'click\')" />',
};

const inboxList = [
  { id: 1, name: 'Email' },
  { id: 2, name: 'Chat' },
];

const mountLimits = (inboxCapacityLimits, props = {}) =>
  mount(InboxCapacityLimits, {
    props: { inboxList, inboxCapacityLimits, ...props },
    global: {
      stubs: {
        AddDataDropdown,
        Button,
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

const inputs = wrapper => wrapper.findAll('input[type="number"]');

describe('InboxCapacityLimits behaviour', () => {
  it('shows a spinner or the empty state', () => {
    expect(
      mountLimits([], { isFetching: true }).find('.spinner').exists()
    ).toBe(true);
    expect(mountLimits([]).text()).toContain(
      'ASSIGNMENT_POLICY.AGENT_CAPACITY_POLICY.FORM.INBOX_CAPACITY_LIMIT.EMPTY_STATE'
    );
  });

  it('offers inboxes without a limit and adds one with the default', async () => {
    const wrapper = mountLimits([{ id: 7, inboxId: 1, conversationLimit: 5 }]);
    const dropdown = wrapper.findComponent(AddDataDropdown);
    expect(dropdown.props('items')).toEqual([{ id: 2, name: 'Chat' }]);
    await dropdown.vm.$emit('add', { id: 2, name: 'Chat' });
    expect(wrapper.emitted('add')).toEqual([
      [{ inboxId: 2, conversationLimit: 10 }],
    ]);

    // Missing inboxes are skipped while the list is still loading.
    const loading = mountLimits([], {
      inboxList: [null, { id: 2, name: 'Chat' }],
    });
    expect(loading.findComponent(AddDataDropdown).props('items')).toEqual([
      { id: 2, name: 'Chat' },
    ]);
  });

  it('lists limits, saves valid ones and flags invalid ones', async () => {
    const wrapper = mountLimits([
      { id: 7, inboxId: 1, conversationLimit: 5 },
      { inboxId: 99, conversationLimit: 5 },
    ]);
    const names = wrapper.findAll('[title] .truncate').map(s => s.text());
    expect(names).toEqual(['Email', '']);

    const [first] = inputs(wrapper);
    await first.setValue('20');
    await first.trigger('blur');
    expect(wrapper.emitted('update')).toEqual([
      [{ id: 7, inboxId: 1, conversationLimit: 20 }],
    ]);
    expect(first.classes()).not.toContain('!text-n-ruby-9');

    await Promise.all(
      ['-1', '100001', '2.5'].map(async value => {
        await first.setValue(value);
        await first.trigger('blur');
      })
    );
    expect(wrapper.emitted('update')).toHaveLength(1);
    expect(first.classes()).toContain('!text-n-ruby-9');
    expect(first.element.parentElement.classList).toContain('outline-n-ruby-8');
  });

  it('deletes a limit', async () => {
    const wrapper = mountLimits([{ id: 7, inboxId: 1, conversationLimit: 5 }]);
    await wrapper.find('.delete').trigger('click');
    expect(wrapper.emitted('delete')).toEqual([[7]]);
  });
});
