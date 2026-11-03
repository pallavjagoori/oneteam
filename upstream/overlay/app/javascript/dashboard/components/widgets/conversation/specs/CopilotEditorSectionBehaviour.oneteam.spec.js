/**
 * OneTeam behaviour spec for the reply box CopilotEditorSection.
 *
 * Covers the editor and thinking states, forwarding editor events,
 * sending and clearing the draft, and the transition hooks.
 */
import { mount } from '@vue/test-utils';
import CopilotEditorSection from '../CopilotEditorSection.vue';

const EditorStub = {
  name: 'CopilotEditor',
  props: { modelValue: String },
  emits: ['update:modelValue', 'focus', 'blur', 'clearSelection', 'send'],
  template: '<div class="editor" />',
};

const TransitionStub = {
  name: 'Transition',
  emits: ['enter', 'afterEnter'],
  template:
    '<div><button class="enter" @click="$emit(\'enter\')" /><button class="after" @click="$emit(\'afterEnter\')" /><slot /></div>',
};

/**
 * Mounts the section.
 *
 * @param {object} props component props
 * @param {Function} [requestEditorHeight] injected height request
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountSection = (props, requestEditorHeight) =>
  mount(CopilotEditorSection, {
    props,
    global: {
      mocks: { $t: key => key },
      provide: requestEditorHeight ? { requestEditorHeight } : {},
      stubs: {
        CopilotEditor: EditorStub,
        CaptainLoader: true,
        Transition: TransitionStub,
      },
    },
  });

describe('CopilotEditorSection behaviour', () => {
  it('renders nothing when hidden and not generating', () => {
    const wrapper = mountSection({});
    expect(wrapper.find('.editor').exists()).toBe(false);
    expect(wrapper.text()).toBe('');
  });

  it('forwards editor events and sends the draft', async () => {
    const wrapper = mountSection({ showCopilotEditor: true });
    const editor = wrapper.findComponent(EditorStub);
    editor.vm.$emit('focus');
    editor.vm.$emit('blur');
    editor.vm.$emit('clearSelection');
    editor.vm.$emit('update:modelValue', 'Draft');
    await wrapper.vm.$nextTick();
    editor.vm.$emit('send');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('blur')).toHaveLength(1);
    expect(wrapper.emitted('clearSelection')).toHaveLength(1);
    expect(wrapper.emitted('send')).toEqual([['Draft']]);
    expect(editor.props('modelValue')).toBe('');
  });

  it('shows the thinking state and frees its height on enter', async () => {
    const requestEditorHeight = vi.fn();
    const wrapper = mountSection(
      { showCopilotEditor: true, isGeneratingContent: true },
      requestEditorHeight
    );
    expect(wrapper.text()).toContain('CONVERSATION.REPLYBOX.COPILOT_THINKING');
    await wrapper.find('.enter').trigger('click');
    await wrapper.find('.after').trigger('click');
    expect(requestEditorHeight).toHaveBeenCalledWith(0);
    expect(wrapper.emitted('contentReady')).toHaveLength(1);
  });

  it('keeps its height on enter while showing the editor', async () => {
    const requestEditorHeight = vi.fn();
    const wrapper = mountSection(
      { showCopilotEditor: true },
      requestEditorHeight
    );
    await wrapper.find('.enter').trigger('click');
    expect(requestEditorHeight).not.toHaveBeenCalled();
  });

  it('uses the default height request without a provider', async () => {
    const wrapper = mountSection({ isGeneratingContent: true });
    await wrapper.find('.enter').trigger('click');
    expect(wrapper.text()).toContain('COPILOT_THINKING');
  });
});
