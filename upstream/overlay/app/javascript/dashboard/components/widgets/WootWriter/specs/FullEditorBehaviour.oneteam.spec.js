/**
 * OneTeam behaviour spec for the help center full article editor.
 *
 * Complements Chatwoot's own FullEditor spec with the remaining edges:
 * dropping files (moved slices, empty drops, positions inside and outside
 * the document), pastes without files, oversized videos, clearing the
 * model, long emission histories, the menubar fallback width, and every
 * method's guard once the editor view is gone.
 */
import { Selection } from '@chatwoot/prosemirror-schema';
import { flushPromises, mount } from '@vue/test-utils';
import { emitter } from 'shared/helpers/mitt';
import { createStore } from 'vuex';
import FullEditor from '../FullEditor.vue';

let view = null;

vi.mock('@chatwoot/prosemirror-schema', async importOriginal => {
  const actual = await importOriginal();
  class TrackedEditorView extends actual.EditorView {
    constructor(...args) {
      super(...args);
      view = this;
    }
  }
  return { ...actual, EditorView: TrackedEditorView };
});

const zeroRect = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
Range.prototype.getClientRects = () => [zeroRect];
Range.prototype.getBoundingClientRect = () => zeroRect;
Element.prototype.scrollIntoView = () => {};
URL.createObjectURL = () => 'blob:vitest';
URL.revokeObjectURL = () => {};

const store = createStore({
  actions: {
    'articles/attachImage': () => new Promise(() => {}),
    'articles/uploadExternalImage': () => Promise.resolve('x'),
  },
  getters: { getUISettings: () => ({}), 'globalConfig/get': () => ({}) },
});

const mountEditor = (props = {}) =>
  mount(FullEditor, {
    props: { modelValue: '', ...props },
    global: {
      plugins: [store],
      mocks: { $route: { params: { portalSlug: 'handbook' } } },
    },
    attachTo: document.body,
  });

const sized = (name, type, megabytes) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: megabytes * 1024 * 1024 });
  return file;
};

const drop = (event, moved = false) =>
  view.props.handleDrop(view, event, null, moved);

describe('FullEditor behaviour', () => {
  let alerts;
  const collect = ({ message }) => alerts.push(message);

  beforeEach(() => {
    alerts = [];
    emitter.on('newToastMessage', collect);
  });
  afterEach(() => {
    emitter.off('newToastMessage', collect);
    document.body.innerHTML = '';
  });

  it('handles dropped files', async () => {
    const wrapper = mountEditor({ modelValue: 'Hello' });
    const preventDefault = vi.fn();
    expect(drop({}, true)).toBe(false);
    expect(drop({ dataTransfer: {} })).toBe(false);
    expect(drop({})).toBe(false);

    const files = [sized('a.png', 'image/png', 1)];
    view.posAtCoords = () => null;
    expect(drop({ dataTransfer: { files }, preventDefault })).toBe(true);
    view.posAtCoords = () => ({ pos: 1 });
    expect(drop({ dataTransfer: { files }, preventDefault })).toBe(true);
    expect(view.state.selection.from).toBe(1);
    expect(preventDefault).toHaveBeenCalledTimes(2);
    await flushPromises();
    wrapper.unmount();
  });

  it('ignores pastes without files and rejects big videos', () => {
    const wrapper = mountEditor();
    const { paste } = view.props.handleDOMEvents;
    const preventDefault = vi.fn();
    paste(view, { preventDefault });
    paste(view, { clipboardData: { files: [] }, preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();

    wrapper.vm.handleFiles([sized('clip.mp4', 'video/mp4', 10000)]);
    expect(alerts).toHaveLength(1);
    wrapper.vm.handleFiles([]);
    expect(alerts).toHaveLength(1);
    wrapper.unmount();
  });

  it('reloads when the model is cleared and trims the emission log', async () => {
    const wrapper = mountEditor();
    'abcdefghijklmnopqrstuv'.split('').forEach(character => {
      view.dispatch(view.state.tr.insertText(character));
    });
    expect(wrapper.vm.emittedValues).toHaveLength(20);
    await wrapper.setProps({ modelValue: wrapper.vm.contentFromEditor() });
    expect(wrapper.vm.pendingSync).toBeNull();
    await wrapper.setProps({ modelValue: null });
    expect(wrapper.vm.contentFromEditor()).toBe('');
    expect(wrapper.vm.emittedValues).toEqual([]);
    wrapper.unmount();
  });

  it('falls back to a default menubar width', () => {
    const wrapper = mountEditor({ modelValue: 'Hello world' });
    wrapper.vm.setMenubarPosition({});
    wrapper.vm.$refs.editor
      .querySelectorAll('.ProseMirror-menubar')
      .forEach(menubar => menubar.remove());
    view.dispatch(
      view.state.tr.setSelection(
        Selection.fromJSON(view.state.doc, { type: 'text', anchor: 1, head: 6 })
      )
    );
    expect(
      wrapper.vm.$refs.editor.style.getPropertyValue('--selection-left')
    ).toBe('0px');
    wrapper.unmount();
  });

  it('guards every method once the view is gone', () => {
    const first = mountEditor();
    const second = mountEditor();
    second.unmount();
    first.unmount();

    const { vm } = first;
    expect(vm.contentFromEditor()).toBe('');
    expect(vm.hasPendingUploads()).toBe(false);
    vm.updateSlashMenuPosition(1);
    vm.handleFiles([sized('a.png', 'image/png', 1)]);
    vm.showVideoInput = true;
    vm.insertVideoEmbed('https://youtu.be/x');
    expect(vm.showVideoInput).toBe(false);
    vm.cancelVideoInput();
    expect(alerts).toEqual([]);
  });
});
