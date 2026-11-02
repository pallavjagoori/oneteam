/**
 * OneTeam behaviour spec for the Copilot follow-up prompt editor.
 *
 * Covers typing (model updates), key, focus and blur events, Enter vs
 * Shift+Enter and other keys, the send button, tracking text selection,
 * reloading the editor when the model changes from outside (but not for
 * its own updates) or the editor id changes, autofocus, and asking the
 * host for room to show the suggestion (and giving it back on unmount).
 *
 * Note: `contentFromEditor` returns '' when no editor view exists, but
 * the view is created on mount before anything can call it, so that
 * line is unreachable.
 */
import { mount, flushPromises } from '@vue/test-utils';
import CopilotEditor from '../CopilotEditor.vue';

const env = vi.hoisted(() => ({ view: null }));

vi.mock('@chatwoot/prosemirror-schema', async importOriginal => {
  const actual = await importOriginal();
  class TrackedEditorView extends actual.EditorView {
    constructor(...args) {
      super(...args);
      env.view = this;
    }
  }
  return { ...actual, EditorView: TrackedEditorView };
});

const zeroRect = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
Range.prototype.getClientRects = () => [zeroRect];
Range.prototype.getBoundingClientRect = () => zeroRect;
Element.prototype.scrollIntoView = () => {};

const NextButton = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="send" @click="$emit(\'click\')" />',
};

let wrapper = null;

const mountEditor = (props = {}, provide = {}) => {
  wrapper = mount(CopilotEditor, {
    props: { modelValue: 'make it shorter', autofocus: false, ...props },
    attachTo: document.body,
    global: {
      provide,
      stubs: { NextButton, Button: NextButton },
      directives: {
        dompurifyHtml: (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
    },
  });
  return wrapper;
};

const domEvent = (name, event) =>
  env.view.someProp('handleDOMEvents', handlers =>
    handlers[name]?.(env.view, event)
  );
const text = () => env.view.state.doc.textContent;

describe('CopilotEditor behaviour', () => {
  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it('emits typed text and editor events', async () => {
    mountEditor();
    env.view.dispatch(env.view.state.tr.insertText('!'));
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toContain('!');
    expect(wrapper.emitted('input')).toHaveLength(1);

    domEvent('keyup', new KeyboardEvent('keyup'));
    domEvent('focus', new FocusEvent('focus'));
    domEvent('blur', new FocusEvent('blur'));
    expect(wrapper.emitted('keyup')).toHaveLength(1);
    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('blur')).toHaveLength(1);

    domEvent('keydown', new KeyboardEvent('keydown', { key: 'a' }));
    domEvent(
      'keydown',
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true })
    );
    expect(wrapper.emitted('send')).toBeUndefined();
    expect(wrapper.emitted('keydown')).toHaveLength(2);

    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });
    domEvent('keydown', enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(wrapper.emitted('send')).toHaveLength(1);

    await wrapper.find('.send').trigger('click');
    expect(wrapper.emitted('send')).toHaveLength(2);
  });

  it('tracks text selection', () => {
    mountEditor();
    const { view } = env;
    // The package does not export TextSelection; the cursor is one.
    const TextSelection = view.state.selection.constructor;
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 5))
    );
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 2, 6))
    );
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 3))
    );
    expect(view.state.selection.empty).toBe(true);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('reloads on outside model or editor id changes', async () => {
    mountEditor({ editorId: 'a' });
    await wrapper.setProps({ modelValue: 'be friendlier' });
    expect(text()).toBe('be friendlier');
    expect(env.view.state.selection.from).toBe(
      env.view.state.doc.content.size - 1
    );

    env.view.dispatch(env.view.state.tr.insertText('!'));
    const own = wrapper.emitted('update:modelValue').at(-1)[0];
    const before = env.view.state;
    await wrapper.setProps({ modelValue: own });
    expect(env.view.state).toBe(before);

    await wrapper.setProps({ modelValue: undefined });
    expect(text()).toBe('');
    await wrapper.setProps({ modelValue: 'again', editorId: 'b' });
    expect(text()).toBe('again');
  });

  it('autofocuses and asks the host for room', async () => {
    const requestEditorHeight = vi.fn();
    mountEditor(
      { autofocus: true, generatedContent: 'Shorter reply' },
      { requestEditorHeight }
    );
    await flushPromises();
    expect(env.view.state.selection.from).toBe(
      env.view.state.doc.content.size - 1
    );
    expect(wrapper.find('p').text()).toBe('Shorter reply');
    expect(requestEditorHeight).toHaveBeenCalledWith(8);
    wrapper.unmount();
    wrapper = null;
    expect(requestEditorHeight).toHaveBeenLastCalledWith(0);
  });
});
