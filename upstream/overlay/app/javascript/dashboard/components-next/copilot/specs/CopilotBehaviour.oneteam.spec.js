/**
 * OneTeam behaviour spec for the Copilot side panel.
 *
 * Covers grouping consecutive "thinking" messages, which message bubble is
 * rendered, when the working loader shows (last assistant reply, pending
 * approval), sending messages (tracking, blocked while a thread loads),
 * closing the panel, the history view (loading, empty, thread list,
 * selection, load more, new chat), the assistant switcher and scrolling
 * to the newest message.
 */
import { nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useTrack } from 'dashboard/composables';
import Copilot from '../Copilot.vue';

const env = vi.hoisted(() => ({ updateUISettings: vi.fn() }));

vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ updateUISettings: env.updateUISettings }),
}));

const stub = (name, props = [], emits = []) => ({
  name,
  props,
  emits,
  template: `<div class="${name}" />`,
});
const Header = stub(
  'SidebarActionsHeader',
  ['title', 'buttons'],
  ['click', 'close']
);
const EmptyState = stub(
  'CopilotEmptyState',
  ['hasAssistants', 'canSuggestReply'],
  ['useSuggestion']
);
const Input = stub('CopilotInput', ['onSend']);
const Toggle = stub(
  'ToggleCopilotAssistant',
  ['assistants', 'activeAssistant'],
  ['setAssistant']
);
const Assistant = stub('CopilotAssistantMessage', [
  'message',
  'isLastMessage',
  'canUseReply',
]);
const Thinking = stub('CopilotThinkingGroup', ['messages', 'defaultCollapsed']);

const mountCopilot = (props = {}) =>
  mount(Copilot, {
    props: { onSendMessage: env.send, assistants: [{ id: 1 }], ...props },
    global: {
      stubs: {
        SidebarActionsHeader: Header,
        CopilotEmptyState: EmptyState,
        CopilotInput: Input,
        ToggleCopilotAssistant: Toggle,
        CopilotAssistantMessage: Assistant,
        CopilotThinkingGroup: Thinking,
        CopilotAgentMessage: stub('CopilotAgentMessage', ['message']),
        CopilotApprovalMessage: stub('CopilotApprovalMessage', ['message']),
        CopilotLoader: stub('CopilotLoader'),
      },
    },
  });

const msg = (id, type, message = { content: id }) => ({
  id,
  message_type: type,
  message,
});
const headerAction = (wrapper, action) =>
  wrapper.findComponent(Header).vm.$emit('click', action);

describe('Copilot panel behaviour', () => {
  beforeEach(() => {
    env.send = vi.fn().mockResolvedValue(true);
  });

  it('groups thinking messages and picks the right bubble', () => {
    const wrapper = mountCopilot({
      messages: [
        msg(1, 'user'),
        msg(2, 'assistant_thinking'),
        msg(3, 'assistant_thinking'),
        msg(4, 'assistant'),
        msg(5, 'assistant_approval', { approval: { status: 'approved' } }),
        msg(6, 'assistant_thinking'),
      ],
      canUseReply: false,
    });
    const classes = wrapper
      .findAll('.space-y-6 > div')
      .map(node => node.classes()[0]);
    expect(classes).toEqual([
      'CopilotAgentMessage',
      'CopilotThinkingGroup',
      'CopilotAssistantMessage',
      'CopilotApprovalMessage',
      'CopilotThinkingGroup',
      'CopilotLoader',
    ]);
    const groups = wrapper.findAllComponents(Thinking);
    expect(groups[0].props('messages').map(m => m.id)).toEqual([2, 3]);
    expect(groups[1].props('defaultCollapsed')).toBe(false);
    expect(wrapper.findComponent(Assistant).props()).toMatchObject({
      isLastMessage: false,
      canUseReply: false,
    });
  });

  it('hides the loader after an assistant reply or while an approval is pending', () => {
    const answered = mountCopilot({
      messages: [msg(1, 'assistant_thinking'), msg(2, 'assistant')],
    });
    expect(answered.find('.CopilotLoader').exists()).toBe(false);
    expect(answered.findComponent(Thinking).props('defaultCollapsed')).toBe(
      true
    );
    expect(answered.findComponent(Assistant).props('isLastMessage')).toBe(true);
    const pending = mountCopilot({
      messages: [
        msg(1, 'user'),
        msg(2, 'assistant_approval', {
          approval: { status: 'awaiting_approval' },
        }),
      ],
    });
    expect(pending.find('.CopilotLoader').exists()).toBe(false);
  });

  it('sends messages from the input and suggestions, and tracks them', async () => {
    const wrapper = mountCopilot();
    expect(await wrapper.findComponent(Input).props('onSend')('hi')).toBe(true);
    expect(env.send).toHaveBeenCalledWith('hi');
    expect(useTrack).toHaveBeenCalledTimes(1);
    const empty = wrapper.findComponent(EmptyState);
    expect(empty.props()).toEqual({
      hasAssistants: true,
      canSuggestReply: true,
    });
    await empty.vm.$emit('useSuggestion', 'summarize');
    await flushPromises();
    expect(env.send).toHaveBeenLastCalledWith('summarize');
  });

  it('does not send while a thread is loading', async () => {
    const wrapper = mountCopilot({ isLoadingSelectedThread: true });
    expect(wrapper.find('[role="status"]').text()).toBe(
      'CAPTAIN.COPILOT.LOADING_CHAT'
    );
    expect(await wrapper.findComponent(Input).props('onSend')('hi')).toBe(
      false
    );
    expect(env.send).not.toHaveBeenCalled();
  });

  it('closes the panel', async () => {
    const wrapper = mountCopilot();
    await wrapper.findComponent(Header).vm.$emit('close');
    expect(env.updateUISettings).toHaveBeenCalledWith({
      is_copilot_panel_open: false,
      is_contact_sidebar_open: false,
    });
  });

  it('shows loading and empty history states', async () => {
    const wrapper = mountCopilot({ isLoadingThreads: true });
    await headerAction(wrapper, 'history');
    expect(wrapper.find('[role="status"]').text()).toBe(
      'CAPTAIN.COPILOT.LOADING_HISTORY'
    );
    await wrapper.setProps({ isLoadingThreads: false });
    expect(wrapper.text()).toContain('CAPTAIN.COPILOT.NO_HISTORY');
    await headerAction(wrapper, 'history');
    expect(wrapper.text()).not.toContain('NO_HISTORY');
    await headerAction(wrapper, 'other');
  });

  it('lists threads, opens one and loads more', async () => {
    const threads = [
      { id: 1, title: 'First' },
      { id: 2, title: 'Second' },
    ];
    const wrapper = mountCopilot({
      threads,
      selectedThreadId: 2,
      hasMoreThreads: true,
      isLoadingThreads: true,
    });
    await headerAction(wrapper, 'history');
    const buttons = wrapper.findAll('button');
    expect(buttons.map(b => b.text())).toEqual([
      'CAPTAIN.COPILOT.NEW_CHAT',
      'First',
      'Second',
      'CAPTAIN.COPILOT.LOAD_MORE',
    ]);
    expect(buttons[2].classes()).toContain('bg-n-alpha-2');
    expect(buttons[3].attributes('disabled')).toBeDefined();
    await wrapper.setProps({ isLoadingThreads: false });
    await wrapper.findAll('button')[3].trigger('click');
    expect(wrapper.emitted('loadMoreThreads')).toHaveLength(1);
    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.emitted('selectThread')[0][0]).toEqual(threads[0]);
    expect(wrapper.text()).not.toContain('LOAD_MORE');
  });

  it('starts a new chat from the history view', async () => {
    const wrapper = mountCopilot();
    await headerAction(wrapper, 'history');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('reset')).toHaveLength(1);
    expect(wrapper.findComponent(EmptyState).exists()).toBe(true);
  });

  it('switches assistants only with several assistants and no open thread', async () => {
    const assistants = [{ id: 1 }, { id: 2 }];
    const wrapper = mountCopilot({ assistants, activeAssistant: { id: 1 } });
    await wrapper.findComponent(Toggle).vm.$emit('setAssistant', { id: 2 });
    expect(wrapper.emitted('setAssistant')[0][0]).toEqual({ id: 2 });
    await wrapper.setProps({ selectedThreadId: 3 });
    expect(wrapper.findComponent(Toggle).exists()).toBe(false);
    const none = mountCopilot({ assistants: [] });
    expect(none.findComponent(Input).exists()).toBe(false);
  });

  it('scrolls to the newest message', async () => {
    const wrapper = mountCopilot({ messages: [msg(1, 'user')] });
    const container = wrapper.find('.overflow-y-auto').element;
    Object.defineProperty(container, 'scrollHeight', { value: 500 });
    await wrapper.setProps({ messages: [msg(1, 'user'), msg(2, 'assistant')] });
    await nextTick();
    expect(container.scrollTop).toBe(500);
    await headerAction(wrapper, 'history');
    await wrapper.setProps({ messages: [] });
    await nextTick();
  });
});
