/**
 * OneTeam behaviour spec for the conversation sidebar actions: assignee,
 * team, priority and labels, including Captain's priority and label
 * suggestions.
 *
 * Composables are mocked with app-Vue refs. Covers self-assign, toggling
 * assignee, team and priority (with alerts and tracking), suggested
 * priority accept and dismiss, and suggested labels accept, reject,
 * failure recovery and the auto-closing "no suggestions" note.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import ConversationAction from '../ConversationAction.vue';

const env = vi.hoisted(() => ({}));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useTimeoutFn: callback => {
    env.timeoutCallback = callback;
    return { start: env.timerStart, stop: env.timerStop };
  },
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
  useTrack: (...args) => env.track(...args),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: name => env.getters[name],
}));
vi.mock('dashboard/composables/useAgentsList', () => ({
  useAgentsList: () => ({ agentsList: env.agents }),
}));
vi.mock('dashboard/composables/useConversationLabels', () => ({
  useConversationLabels: () => env.labels,
}));
vi.mock('dashboard/composables/useConversationSuggestions', () => ({
  useConversationSuggestions: kind => env.suggestions[kind],
}));

const suggestion = () => ({
  isEnabled: ref(true),
  isActive: ref(false),
  isLoading: ref(false),
  suggestions: ref(null),
  toggleSuggestions: vi.fn(),
  dismiss: vi.fn(),
});

const Multiselect = {
  name: 'MultiselectDropdown',
  props: ['options', 'selectedItem'],
  emits: ['select'],
  template: '<div class="multi" />',
};
const LabelBox = {
  name: 'LabelBox',
  props: ['suggestedLabels', 'isSuggestionActive', 'isSuggesting'],
  emits: ['acceptSuggestion', 'rejectSuggestion', 'acceptAllSuggestions'],
  template: '<div class="labels" />',
};

const mountAction = async () => {
  const wrapper = mount(ConversationAction, {
    props: { conversationId: 12 },
    global: {
      stubs: {
        ContactDetailsItem: {
          props: ['title'],
          template: '<div><slot name="button" /></div>',
        },
        MultiselectDropdown: Multiselect,
        ConversationLabels: LabelBox,
        NextButton: {
          props: ['label'],
          emits: ['click'],
          template: '<button class="self" @click="$emit(\'click\')" />',
        },
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
        SuggestButton: {
          name: 'SuggestButton',
          props: ['isActive', 'isLoading'],
          emits: ['click'],
          template: '<button class="suggest" @click="$emit(\'click\')" />',
        },
        SuggestionSkeleton: { template: '<div class="skeleton" />' },
        Transition: { template: '<div><slot /></div>' },
      },
      directives: { tooltip: {} },
    },
  });
  await flushPromises();
  return wrapper;
};

const dropdowns = wrapper => wrapper.findAllComponents(Multiselect);
const agentDropdown = wrapper => dropdowns(wrapper)[0];
const teamDropdown = wrapper => dropdowns(wrapper)[1];
const priorityDropdown = wrapper => dropdowns(wrapper)[2];
const labels = wrapper => wrapper.findComponent(LabelBox);
const suggestButtons = wrapper => wrapper.findAll('.suggest');
const calls = action => env.dispatch.mock.calls.filter(c => c[0] === action);
const alerts = () => env.alert.mock.calls.map(c => c[0]);

describe('ConversationAction behaviour', () => {
  beforeEach(() => {
    env.alert = vi.fn();
    env.track = vi.fn();
    env.timerStart = vi.fn();
    env.timerStop = vi.fn();
    env.dispatch = vi.fn(() => Promise.resolve());
    env.chat = ref({
      id: 12,
      priority: null,
      meta: { assignee: null, team: null },
    });
    env.getters = {
      getSelectedChat: env.chat,
      getCurrentUser: ref({
        id: 1,
        name: 'Me',
        email: 'me@x.test',
        account_id: 3,
        availability_status: 'online',
        available_name: 'Me',
        role: 'agent',
        avatar_url: 'me.png',
      }),
      'teams/getTeams': ref([{ id: 4, name: 'Sales' }]),
    };
    env.agents = ref([
      { id: 1, name: 'Me' },
      { id: 2, name: 'Bo' },
    ]);
    env.labels = {
      accountLabels: ref([
        { title: 'vip' },
        { title: 'bug' },
        { title: 'old' },
      ]),
      savedLabels: ref(['old']),
      onUpdateLabels: vi.fn(next => {
        if (!env.labelsFail) env.labels.savedLabels.value = next;
        return Promise.resolve();
      }),
    };
    env.labelsFail = false;
    env.suggestions = { priority: suggestion(), labels: suggestion() };
  });

  it('lists agents and teams, with a "none" team only when one is set', async () => {
    const wrapper = await mountAction();
    expect(agentDropdown(wrapper).props('options')).toEqual(env.agents.value);
    expect(agentDropdown(wrapper).props('selectedItem')).toBe(null);
    expect(teamDropdown(wrapper).props('options')).toEqual([
      { id: 4, name: 'Sales' },
    ]);
    env.chat.value.meta.team = { id: 4, name: 'Sales' };
    await flushPromises();
    expect(teamDropdown(wrapper).props('options')[0]).toEqual({
      id: 0,
      name: 'TEAMS_SETTINGS.LIST.NONE',
    });
  });

  it('self-assigns and hides the shortcut once assigned to me', async () => {
    const wrapper = await mountAction();
    await wrapper.find('.self').trigger('click');
    await flushPromises();
    expect(calls('setCurrentChatAssignee')[0][1]).toEqual({
      conversationId: 12,
      assignee: {
        account_id: 3,
        availability_status: 'online',
        available_name: 'Me',
        email: 'me@x.test',
        id: 1,
        name: 'Me',
        role: 'agent',
        thumbnail: 'me.png',
      },
      assigneeType: 'User',
    });
    expect(calls('assignAgent')[0][1]).toEqual({
      conversationId: 12,
      agentId: 1,
      assigneeType: 'User',
    });
    expect(alerts()).toContain('CONVERSATION.CHANGE_AGENT');

    env.chat.value.meta.assignee = { id: 1 };
    await flushPromises();
    expect(wrapper.find('.self').exists()).toBe(false);
    expect(agentDropdown(wrapper).props('selectedItem')).toEqual({
      id: 1,
      assignee_type: 'User',
    });
    // Same id but assigned as a bot still shows self-assign.
    env.chat.value.meta.assignee_type = 'AgentBot';
    await flushPromises();
    expect(wrapper.find('.self').exists()).toBe(true);
    env.chat.value.meta.assignee_type = undefined;
    env.chat.value.meta.assignee = { id: 2 };
    await flushPromises();
    expect(wrapper.find('.self').exists()).toBe(true);
  });

  it('toggles the assignee from the dropdown', async () => {
    env.chat.value.meta.assignee = { id: 2 };
    const wrapper = await mountAction();
    agentDropdown(wrapper).vm.$emit('select', { id: 2 });
    expect(calls('assignAgent').at(-1)[1]).toEqual({
      conversationId: 12,
      agentId: null,
      assigneeType: null,
    });
    agentDropdown(wrapper).vm.$emit('select', {
      id: 2,
      assignee_type: 'AgentBot',
    });
    expect(calls('assignAgent').at(-1)[1]).toEqual({
      conversationId: 12,
      agentId: 2,
      assigneeType: 'AgentBot',
    });
    agentDropdown(wrapper).vm.$emit('select', { id: 5 });
    expect(calls('assignAgent').at(-1)[1].agentId).toBe(5);
  });

  it('toggles the team', async () => {
    const wrapper = await mountAction();
    teamDropdown(wrapper).vm.$emit('select', { id: 4, name: 'Sales' });
    await flushPromises();
    expect(calls('setCurrentChatTeam')[0][1]).toEqual({
      team: { id: 4, name: 'Sales' },
      conversationId: 12,
    });
    expect(calls('assignTeam')[0][1]).toEqual({
      conversationId: 12,
      teamId: 4,
    });
    expect(alerts()).toContain('CONVERSATION.CHANGE_TEAM');

    env.chat.value.meta.team = { id: 4 };
    teamDropdown(wrapper).vm.$emit('select', { id: 4 });
    expect(calls('assignTeam').at(-1)[1]).toEqual({
      conversationId: 12,
      teamId: 0,
    });
  });

  it('changes and clears the priority with tracking', async () => {
    const wrapper = await mountAction();
    expect(priorityDropdown(wrapper).props('selectedItem').id).toBe(null);
    priorityDropdown(wrapper).vm.$emit('select', {
      id: 'urgent',
      name: 'CONVERSATION.PRIORITY.OPTIONS.URGENT',
    });
    await flushPromises();
    expect(calls('assignPriority')[0][1]).toEqual({
      conversationId: 12,
      priority: 'urgent',
    });
    expect(env.track).toHaveBeenCalledWith(
      'Assigned priority to a conversation',
      { oldValue: null, newValue: 'urgent', from: 'Conversation Sidebar' }
    );
    expect(alerts()).toContain(
      'CONVERSATION.PRIORITY.CHANGE_PRIORITY.SUCCESSFUL'
    );

    env.chat.value.priority = 'urgent';
    await flushPromises();
    expect(priorityDropdown(wrapper).props('selectedItem').id).toBe('urgent');
    priorityDropdown(wrapper).vm.$emit('select', { id: 'urgent' });
    expect(calls('assignPriority').at(-1)[1].priority).toBe(null);
  });

  it('requests, shows and accepts a suggested priority', async () => {
    const priority = env.suggestions.priority;
    env.chat.value.priority = 'low';
    const wrapper = await mountAction();
    await suggestButtons(wrapper)[0].trigger('click');
    expect(env.track).toHaveBeenCalledWith(
      'Captain: Priority suggestion requested',
      { conversationId: 12 }
    );
    expect(priority.toggleSuggestions).toHaveBeenCalled();

    priority.isLoading.value = true;
    await flushPromises();
    expect(wrapper.find('.skeleton').exists()).toBe(true);

    priority.isLoading.value = false;
    priority.isActive.value = true;
    priority.suggestions.value = { priority: 'high' };
    await flushPromises();
    expect(wrapper.text()).toContain('CONVERSATION.PRIORITY.OPTIONS.LOW');
    expect(wrapper.find('.i-woot-priority-high').exists()).toBe(true);

    // Toggling while active does not track again.
    env.track.mockClear();
    await suggestButtons(wrapper)[0].trigger('click');
    expect(env.track).not.toHaveBeenCalled();

    const [accept, reject] = wrapper.findAll('button[type="button"]');
    await reject.trigger('click');
    expect(priority.dismiss).toHaveBeenCalledTimes(1);
    await accept.trigger('click');
    expect(calls('assignPriority').at(-1)[1].priority).toBe('high');
    expect(priority.dismiss).toHaveBeenCalledTimes(2);
  });

  it('shows the suggestion without a strike-through when no priority is set', async () => {
    const priority = env.suggestions.priority;
    priority.isActive.value = true;
    priority.suggestions.value = { priority: 'medium' };
    const wrapper = await mountAction();
    expect(wrapper.find('.line-through').exists()).toBe(false);
    expect(wrapper.text()).toContain('CONVERSATION.PRIORITY.OPTIONS.MEDIUM');
  });

  it('notes when the suggested priority is already set', async () => {
    const priority = env.suggestions.priority;
    env.chat.value.priority = 'high';
    priority.isActive.value = true;
    priority.suggestions.value = { priority: 'high' };
    const wrapper = await mountAction();
    expect(wrapper.text()).toContain('CONVERSATION.SUGGESTIONS.EMPTY');
    expect(priorityDropdown(wrapper).exists()).toBe(true);
  });

  it('hides suggest buttons when suggestions are disabled', async () => {
    env.suggestions.priority.isEnabled.value = false;
    const wrapper = await mountAction();
    expect(suggestButtons(wrapper)).toHaveLength(0);
  });

  it('suggests labels, filtering out saved and rejected ones', async () => {
    const label = env.suggestions.labels;
    const wrapper = await mountAction();
    await suggestButtons(wrapper)[1].trigger('click');
    expect(env.track).toHaveBeenCalledWith(
      'Captain: Label suggestions requested',
      { conversationId: 12 }
    );
    expect(label.toggleSuggestions).toHaveBeenCalled();

    label.isActive.value = true;
    label.suggestions.value = {
      labels: [
        { title: 'vip' },
        { title: 'bug' },
        { title: 'old' },
        { title: 'nope' },
      ],
    };
    await flushPromises();
    expect(labels(wrapper).props('suggestedLabels')).toEqual([
      { title: 'vip' },
      { title: 'bug' },
    ]);
    labels(wrapper).vm.$emit('rejectSuggestion', { title: 'bug' });
    await flushPromises();
    expect(labels(wrapper).props('suggestedLabels')).toEqual([
      { title: 'vip' },
    ]);

    // Asking again while active clears rejections without tracking.
    env.track.mockClear();
    await suggestButtons(wrapper)[1].trigger('click');
    await flushPromises();
    expect(env.track).not.toHaveBeenCalled();
    expect(labels(wrapper).props('suggestedLabels')).toHaveLength(2);
  });

  it('accepts suggested labels and closes when none are left', async () => {
    const label = env.suggestions.labels;
    label.isActive.value = true;
    label.suggestions.value = { labels: [{ title: 'vip' }, { title: 'bug' }] };
    const wrapper = await mountAction();
    labels(wrapper).vm.$emit('acceptSuggestion', { title: 'vip' });
    await flushPromises();
    expect(env.labels.onUpdateLabels).toHaveBeenCalledWith(['old', 'vip']);
    expect(label.dismiss).not.toHaveBeenCalled();

    labels(wrapper).vm.$emit('acceptAllSuggestions');
    await flushPromises();
    expect(env.labels.onUpdateLabels).toHaveBeenLastCalledWith([
      'old',
      'vip',
      'bug',
    ]);
    expect(label.dismiss).toHaveBeenCalled();
    expect(env.timerStart).not.toHaveBeenCalled();
  });

  it('brings suggestions back when saving labels fails', async () => {
    const label = env.suggestions.labels;
    label.isActive.value = true;
    label.suggestions.value = { labels: [{ title: 'vip' }] };
    env.labelsFail = true;
    const wrapper = await mountAction();
    labels(wrapper).vm.$emit('acceptSuggestion', { title: 'vip' });
    await flushPromises();
    expect(alerts()).toContain('CONVERSATION.SUGGESTIONS.APPLY_ERROR');
    expect(label.toggleSuggestions).not.toHaveBeenCalled();

    label.isActive.value = false;
    labels(wrapper).vm.$emit('acceptSuggestion', { title: 'vip' });
    await flushPromises();
    expect(label.toggleSuggestions).toHaveBeenCalled();
  });

  it('shows a short note and closes when there are no new labels', async () => {
    const label = env.suggestions.labels;
    await mountAction();
    label.isActive.value = true;
    label.isLoading.value = true;
    await flushPromises();
    expect(env.timerStop).toHaveBeenCalled();
    expect(env.timerStart).not.toHaveBeenCalled();
    label.isLoading.value = false;
    label.suggestions.value = { labels: [] };
    await flushPromises();
    expect(env.timerStart).toHaveBeenCalled();
    expect(env.timeoutCallback).toBe(label.dismiss);
  });
});
