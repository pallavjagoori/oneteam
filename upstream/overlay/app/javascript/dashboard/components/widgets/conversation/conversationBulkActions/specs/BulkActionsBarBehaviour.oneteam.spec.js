/**
 * OneTeam behaviour spec for the conversation list's bulk actions bar.
 *
 * Covers showing the bar only with a selection, the "all selected" alert
 * and select-all checkbox, clearing the selection, wiring each child
 * picker to its bulk action, labels already applied to the selection,
 * which status actions show, the macros picker behind its feature flag,
 * and the command bar snooze / reopen / resolve events (custom snooze
 * modal, preset, raw timestamp, unknown option), removed on unmount.
 */
import { computed, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import {
  CMD_BULK_ACTION_SNOOZE_CONVERSATION,
  CMD_BULK_ACTION_REOPEN_CONVERSATION,
  CMD_BULK_ACTION_RESOLVE_CONVERSATION,
} from 'dashboard/helper/commandbar/events';
import BulkActionsBar from '../Index.vue';

const env = vi.hoisted(() => ({ bulk: {}, macros: true, conversations: {} }));

vi.mock('dashboard/composables/chatlist/useBulkActions.js', () => ({
  useBulkActions: () => env.bulk,
}));
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ isFeatureFlagEnabled: () => env.macros }),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => computed(() => id => env.conversations[id]),
}));
vi.mock('dashboard/helper/snoozeHelpers', () => ({
  findSnoozeTime: type => (type === 'an_hour_from_now' ? 3600 : undefined),
}));

const child = (name, events, props = []) => ({
  name,
  props,
  emits: events,
  template: `<div class="${name}" />`,
});
const stubs = {
  BulkLabelActions: child('BulkLabelActions', ['assign', 'remove'], ['action', 'appliedLabels']),
  BulkUpdateActions: child('BulkUpdateActions', ['update'], ['showResolve', 'showReopen', 'showSnooze']),
  BulkAgentActions: child('BulkAgentActions', ['select'], ['selectedInboxes', 'conversationCount']),
  BulkTeamActions: child('BulkTeamActions', ['select'], ['conversationCount']),
  BulkMacroActions: child('BulkMacroActions', ['execute'], ['conversationCount']),
  CustomSnoozeModal: child('CustomSnoozeModal', ['close', 'chooseTime']),
  Checkbox: {
    name: 'Checkbox',
    props: ['modelValue', 'indeterminate'],
    emits: ['update:modelValue'],
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  },
  NextButton: {
    name: 'NextButton',
    props: ['label'],
    emits: ['click'],
    template: '<button class="clear" @click="$emit(\'click\')">{{ label }}</button>',
  },
  WootModal: {
    name: 'WootModal',
    props: ['show', 'onClose'],
    template: '<div v-if="show" class="snooze-modal"><slot /></div>',
  },
  Transition: { template: '<div><slot /></div>' },
};

const mounted = [];
const mountBar = props => {
  const wrapper = mount(BulkActionsBar, {
    props: { conversations: [{ id: 1 }, { id: 2 }], ...props },
    global: { stubs, mocks: { $t: (key, args) => (args ? `${key}:${args.conversationCount}` : key) } },
  });
  mounted.push(wrapper);
  return wrapper;
};
const find = (wrapper, name) => wrapper.findComponent({ name });

describe('Bulk actions bar behaviour', () => {
  beforeEach(() => {
    env.macros = true;
    env.conversations = { 1: { labels: ['vip', 'lead'] }, 2: { labels: ['vip'] }, 3: {} };
    env.bulk = {
      selectedConversations: ref([1, 2, 3, 4]),
      onAssignAgent: vi.fn(),
      onAssignLabels: vi.fn(),
      onRemoveLabels: vi.fn(),
      onAssignTeamsForBulk: vi.fn(),
      onUpdateConversations: vi.fn(),
      onExecuteMacro: vi.fn(),
    };
  });

  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount());
  });

  it('hides without a selection', () => {
    const wrapper = mountBar({ conversations: [] });
    expect(wrapper.find('.BulkUpdateActions').exists()).toBe(false);
  });

  it('shows the selection and toggles select-all', async () => {
    const wrapper = mountBar({ selectedInboxes: [5] });
    expect(wrapper.text()).toContain('BULK_ACTION.CONVERSATIONS_SELECTED');
    expect(wrapper.text()).not.toContain('BULK_ACTION.ALL_CONVERSATIONS_SELECTED_ALERT');
    expect(find(wrapper, 'Checkbox').props('indeterminate')).toBe(true);
    await wrapper.find('input').setValue(true);
    await wrapper.find('.clear').trigger('click');
    expect(wrapper.emitted('selectAllConversations')).toEqual([[true], [false]]);

    await wrapper.setProps({ allConversationsSelected: true });
    expect(wrapper.text()).toContain('BULK_ACTION.ALL_CONVERSATIONS_SELECTED_ALERT');
    expect(find(wrapper, 'Checkbox').props('indeterminate')).toBe(false);
  });

  it('wires every picker to its bulk action', () => {
    const wrapper = mountBar({ selectedInboxes: [5], showOpenAction: true });
    const [assign, remove] = wrapper.findAllComponents({ name: 'BulkLabelActions' });
    expect(remove.props('appliedLabels')).toEqual(['vip', 'lead']);
    assign.vm.$emit('assign', ['vip']);
    remove.vm.$emit('remove', ['lead']);
    expect(find(wrapper, 'BulkUpdateActions').props()).toEqual({
      showResolve: true,
      showReopen: false,
      showSnooze: true,
    });
    find(wrapper, 'BulkUpdateActions').vm.$emit('update', 'resolved');
    expect(find(wrapper, 'BulkAgentActions').props()).toEqual({ selectedInboxes: [5], conversationCount: 2 });
    find(wrapper, 'BulkAgentActions').vm.$emit('select', { id: 3 });
    find(wrapper, 'BulkTeamActions').vm.$emit('select', { id: 4 });
    find(wrapper, 'BulkMacroActions').vm.$emit('execute', { id: 6 });
    expect(env.bulk.onAssignLabels).toHaveBeenCalledWith(['vip']);
    expect(env.bulk.onRemoveLabels).toHaveBeenCalledWith(['lead']);
    expect(env.bulk.onUpdateConversations).toHaveBeenCalledWith('resolved');
    expect(env.bulk.onAssignAgent).toHaveBeenCalledWith({ id: 3 });
    expect(env.bulk.onAssignTeamsForBulk).toHaveBeenCalledWith({ id: 4 });
    expect(env.bulk.onExecuteMacro).toHaveBeenCalledWith({ id: 6 });
  });

  it('hides macros without the feature', () => {
    env.macros = false;
    const wrapper = mountBar();
    expect(wrapper.find('.BulkMacroActions').exists()).toBe(false);
  });

  it('follows command bar status events until unmounted', async () => {
    const wrapper = mountBar();
    emitter.emit(CMD_BULK_ACTION_REOPEN_CONVERSATION);
    emitter.emit(CMD_BULK_ACTION_RESOLVE_CONVERSATION);
    emitter.emit(CMD_BULK_ACTION_SNOOZE_CONVERSATION, 1700000000);
    emitter.emit(CMD_BULK_ACTION_SNOOZE_CONVERSATION, 'an_hour_from_now');
    emitter.emit(CMD_BULK_ACTION_SNOOZE_CONVERSATION, 'until_next_reply');
    expect(env.bulk.onUpdateConversations.mock.calls).toEqual([
      ['open', null],
      ['resolved', null],
      ['snoozed', 1700000000],
      ['snoozed', 3600],
      ['snoozed', null],
    ]);

    emitter.emit(CMD_BULK_ACTION_SNOOZE_CONVERSATION, 'until_custom_time');
    await flushPromises();
    expect(wrapper.find('.snooze-modal').exists()).toBe(true);
    find(wrapper, 'CustomSnoozeModal').vm.$emit('chooseTime', new Date(1700000000000));
    await flushPromises();
    expect(wrapper.find('.snooze-modal').exists()).toBe(false);
    expect(env.bulk.onUpdateConversations).toHaveBeenLastCalledWith('snoozed', 1700000000);

    emitter.emit(CMD_BULK_ACTION_SNOOZE_CONVERSATION, 'until_custom_time');
    await flushPromises();
    find(wrapper, 'CustomSnoozeModal').vm.$emit('chooseTime', null);
    await flushPromises();
    expect(env.bulk.onUpdateConversations).toHaveBeenCalledTimes(6);

    emitter.emit(CMD_BULK_ACTION_SNOOZE_CONVERSATION, 'until_custom_time');
    await flushPromises();
    find(wrapper, 'CustomSnoozeModal').vm.$emit('close');
    await flushPromises();
    expect(wrapper.find('.snooze-modal').exists()).toBe(false);
    emitter.emit(CMD_BULK_ACTION_SNOOZE_CONVERSATION, 'until_custom_time');
    await flushPromises();
    find(wrapper, 'WootModal').props('onClose')();
    await flushPromises();
    expect(wrapper.find('.snooze-modal').exists()).toBe(false);

    wrapper.unmount();
    mounted.splice(0);
    emitter.emit(CMD_BULK_ACTION_REOPEN_CONVERSATION);
    expect(env.bulk.onUpdateConversations).toHaveBeenCalledTimes(6);
  });
});
