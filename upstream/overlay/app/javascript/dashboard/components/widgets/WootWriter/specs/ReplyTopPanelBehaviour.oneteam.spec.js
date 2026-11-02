/**
 * OneTeam behaviour spec for the reply box's top panel.
 *
 * Covers toggling between reply and private note, the Alt+P / Alt+L
 * shortcuts (reply blocked when restricted), the character warning,
 * the Captain copilot menu (open tracking, actions with the editor
 * content fallback, closing on an outside click) and the editor size
 * toggle, and hiding Captain tools when they are off.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useTrack } from 'dashboard/composables';
import { CAPTAIN_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import ReplyTopPanel from '../ReplyTopPanel.vue';

const captainTasksEnabled = ref(true);
let shortcuts;
let outside;

vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));
vi.mock('dashboard/composables/useCaptain', () => ({
  useCaptain: () => ({ captainTasksEnabled }),
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: table => {
    shortcuts = table;
  },
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      outside = binding.value;
    },
  },
}));

const EditorModeToggle = {
  name: 'EditorModeToggle',
  props: ['mode', 'disabled', 'isReplyRestricted'],
  emits: ['toggleMode'],
  template: '<div class="mode" />',
};
const CopilotMenuBar = {
  name: 'CopilotMenuBar',
  props: ['hasSelection', 'hasContent', 'conversationId'],
  emits: ['executeCopilotAction'],
  template: '<div class="copilot" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['icon', 'disabled'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};

const mountPanel = (props = {}) =>
  mount(ReplyTopPanel, {
    props: { conversationId: 12, editorContent: 'draft', ...props },
    global: { stubs: { EditorModeToggle, CopilotMenuBar, NextButton } },
  });

describe('ReplyTopPanel behaviour', () => {
  beforeEach(() => {
    captainTasksEnabled.value = true;
  });

  it('toggles between reply and note', async () => {
    const wrapper = mountPanel();
    await wrapper.findComponent(EditorModeToggle).vm.$emit('toggleMode');
    await wrapper.setProps({ mode: 'NOTE' });
    await wrapper.findComponent(EditorModeToggle).vm.$emit('toggleMode');
    expect(wrapper.emitted('setReplyMode')).toEqual([['NOTE'], ['REPLY']]);
    expect(wrapper.vm.replyButtonClass).toEqual({ 'is-active': false });
    expect(wrapper.vm.noteButtonClass).toEqual({ 'is-active': true });
  });

  it('switches modes with shortcuts unless reply is restricted', async () => {
    const wrapper = mountPanel();
    shortcuts['Alt+KeyP'].action();
    shortcuts['Alt+KeyL'].action();
    expect(wrapper.emitted('setReplyMode')).toEqual([['NOTE'], ['REPLY']]);

    await wrapper.setProps({ isReplyRestricted: true });
    shortcuts['Alt+KeyL'].action();
    expect(wrapper.emitted('setReplyMode')).toHaveLength(2);
  });

  it('warns about the remaining and exceeded characters', async () => {
    const wrapper = mountPanel({
      isMessageLengthReachingThreshold: true,
      charactersRemaining: 12,
    });
    expect(wrapper.find('.text-n-slate-11').text()).toBe(
      '12 characters remaining'
    );
    await wrapper.setProps({ charactersRemaining: -3 });
    expect(wrapper.find('.text-n-ruby-9').text()).toBe('3 characters over');
  });

  it('opens the copilot menu and runs actions', async () => {
    const wrapper = mountPanel({ hasContent: true });
    const toggle = wrapper.find('[data-icon="i-ph-sparkle-fill"]');
    await toggle.trigger('click');
    expect(useTrack).toHaveBeenCalledWith(
      CAPTAIN_EVENTS.EDITOR_AI_MENU_OPENED,
      { conversationId: 12, entryPoint: 'top_panel' }
    );
    const menu = wrapper.findComponent(CopilotMenuBar);
    expect(menu.props('hasContent')).toBe(true);

    await menu.vm.$emit('executeCopilotAction', 'rephrase');
    expect(wrapper.emitted('executeCopilotAction')[0]).toEqual([
      'rephrase',
      'draft',
    ]);
    expect(wrapper.findComponent(CopilotMenuBar).exists()).toBe(false);

    await toggle.trigger('click');
    await wrapper
      .findComponent(CopilotMenuBar)
      .vm.$emit('executeCopilotAction', 'fix', 'picked');
    expect(wrapper.emitted('executeCopilotAction')[1]).toEqual([
      'fix',
      'picked',
    ]);
  });

  it('closes the copilot menu on toggle or an outside click', async () => {
    const wrapper = mountPanel();
    const toggle = wrapper.find('[data-icon="i-ph-sparkle-fill"]');
    await toggle.trigger('click');
    await toggle.trigger('click');
    expect(useTrack).toHaveBeenCalledTimes(1);
    expect(wrapper.findComponent(CopilotMenuBar).exists()).toBe(false);

    await toggle.trigger('click');
    outside[0]();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(CopilotMenuBar).exists()).toBe(false);
  });

  it('toggles the editor size', async () => {
    const wrapper = mountPanel();
    await wrapper.find('[data-icon="i-lucide-maximize-2"]').trigger('click');
    expect(wrapper.emitted('toggleEditorSize')).toHaveLength(1);
  });

  it('hides Captain tools when they are off', () => {
    captainTasksEnabled.value = false;
    const wrapper = mountPanel();
    expect(wrapper.find('[data-icon="i-ph-sparkle-fill"]').exists()).toBe(
      false
    );
  });
});
