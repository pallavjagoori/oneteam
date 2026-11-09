/**
 * OneTeam behaviour spec for the new conversation message editor.
 *
 * Covers the editor model update, running copilot actions only with a
 * copilot, and the copilot editor transition key and section.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import MessageEditor from '../MessageEditor.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

/**
 * Mounts the editor.
 *
 * @param {object} props props overrides
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountEditor = props =>
  mount(MessageEditor, {
    props,
    global: {
      stubs: {
        Transition: { template: '<div><slot /></div>' },
        Editor: {
          name: 'Editor',
          emits: ['update:modelValue', 'executeCopilotAction'],
          template: '<div class="editor" />',
        },
        CopilotEditorSection: {
          name: 'CopilotEditorSection',
          emits: ['focus', 'blur', 'clearSelection', 'contentReady', 'send'],
          template: '<div class="copilot" />',
        },
      },
    },
  });

describe('MessageEditor behaviour', () => {
  it('updates the model and ignores copilot actions without a copilot', () => {
    const wrapper = mountEditor();
    const editor = wrapper.findComponent({ name: 'Editor' });
    editor.vm.$emit('update:modelValue', 'Hello');
    editor.vm.$emit('executeCopilotAction', 'improve', {});
    expect(wrapper.emitted('update:modelValue')).toEqual([['Hello']]);
  });

  it('runs copilot actions and shows the copilot section when active', async () => {
    const copilot = {
      isActive: ref(false),
      editorTransitionKey: ref('copilot-1'),
      showEditor: ref(true),
      isGenerating: ref(false),
      generatedContent: ref(''),
      execute: vi.fn(),
      setContentReady: vi.fn(),
      sendFollowUp: vi.fn(),
    };
    const wrapper = mountEditor({ copilot });
    wrapper
      .findComponent({ name: 'Editor' })
      .vm.$emit('executeCopilotAction', 'improve', { tone: 'calm' });
    expect(copilot.execute).toHaveBeenCalledWith('improve', { tone: 'calm' });

    copilot.isActive.value = true;
    await wrapper.vm.$nextTick();
    const section = wrapper.findComponent({ name: 'CopilotEditorSection' });
    ['focus', 'blur', 'clearSelection'].forEach(event =>
      section.vm.$emit(event)
    );
    section.vm.$emit('contentReady');
    section.vm.$emit('send', 'more');
    expect(copilot.setContentReady).toHaveBeenCalled();
    expect(copilot.sendFollowUp).toHaveBeenCalledWith('more');
  });
});
