/**
 * OneTeam behaviour specs for the ProseMirror message editor: v-model,
 * focus and typing events, the suggestion pickers (mentions, canned
 * responses, variables, macros, emoji, Captain tools), signatures, image
 * uploads, pasting, keyboard handling and the Copilot selection menu.
 * The pickers are stubs; the editor itself is real.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import { uploadFile } from 'dashboard/helper/uploadHelper';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { emitter } from 'shared/helpers/mitt';
import { nextTick } from 'vue';
import { createStore } from 'vuex';
import Editor from '../Editor.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: 1 } }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('dashboard/composables', async importOriginal => ({
  ...(await importOriginal()),
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/helper/uploadHelper', () => ({ uploadFile: vi.fn() }));

// Keep the shortcut table so tests can run each action directly.
const shortcuts = {};
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => Object.assign(shortcuts, events),
}));

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

// jsdom has no layout, and ProseMirror measures the caret through Range rects.
const zeroRect = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
Range.prototype.getClientRects = () => [zeroRect];
Range.prototype.getBoundingClientRect = () => zeroRect;
Element.prototype.scrollIntoView = () => {};
document.elementFromPoint = () => null;

const pickerStub = name => ({ name, template: '<div />' });
const stubs = {
  TagAgents: pickerStub('TagAgents'),
  CannedResponse: pickerStub('CannedResponse'),
  VariableList: pickerStub('VariableList'),
  MacroList: pickerStub('MacroList'),
  KeyboardEmojiSelector: pickerStub('KeyboardEmojiSelector'),
  TagTools: pickerStub('TagTools'),
  CopilotMenuBar: pickerStub('CopilotMenuBar'),
};

const buildStore = ({ uiSettings = {}, features = [] } = {}) =>
  createStore({
    state: { uiSettings: { editor_message_key: 'cmd_enter', ...uiSettings } },
    mutations: {
      setUISettings: (s, value) => {
        s.uiSettings = { ...s.uiSettings, ...value };
      },
    },
    getters: {
      getUISettings: s => s.uiSettings,
      getSelectedChat: () => ({ id: 1 }),
      getCurrentAccountId: () => 1,
      'globalConfig/get': () => ({}),
      'globalConfig/isOnChatwootCloud': () => false,
      'accounts/getAccount': () => () => ({ id: 1 }),
      'accounts/getUIFlags': () => ({}),
      'accounts/isFeatureEnabledonAccount': () => (_, flag) =>
        features.includes(flag),
      'draftMessages/getReplyEditorMode': () => 'reply',
      'draftMessages/get': () => () => '',
    },
  });

let wrapper = null;
const mountEditor = (props = {}, { store = buildStore(), attrs } = {}) => {
  wrapper = mount(Editor, {
    props: { modelValue: '', ...props },
    attrs,
    global: { plugins: [store], stubs },
    attachTo: document.body,
  });
  return { wrapper, store };
};

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

const lastValue = () => wrapper.emitted('update:modelValue')?.at(-1)?.[0];
const typeText = async text => {
  view.dispatch(view.state.tr.insertText(text));
  await nextTick();
};
const domEvent = (name, event) =>
  view.someProp('handleDOMEvents', handlers => handlers[name]?.(view, event));

describe('Editor behaviour', () => {
  describe('editing', () => {
    it('emits the markdown on every change and starts typing', async () => {
      mountEditor({ modelValue: 'Hello' });
      await typeText(' there');
      expect(lastValue()).toBe('Hello there');
      expect(wrapper.emitted('input').at(-1)).toEqual(['Hello there']);

      domEvent('keyup', new KeyboardEvent('keyup'));
      expect(wrapper.emitted('typingOn')).toHaveLength(1);
      const focused = wrapper.emitted('focus')?.length || 0;
      domEvent('focus', new FocusEvent('focus'));
      expect(wrapper.emitted('focus')).toHaveLength(focused + 1);
      const blurred = wrapper.emitted('blur')?.length || 0;
      domEvent('blur', new FocusEvent('blur'));
      expect(wrapper.emitted('typingOff')).toHaveLength(1);
      expect(wrapper.emitted('blur')).toHaveLength(blurred + 1);
    });

    it('reloads when the value, draft, mode or channel changes', async () => {
      mountEditor({ modelValue: 'One' });
      await wrapper.setProps({ modelValue: 'Two' });
      expect(view.state.doc.textContent).toBe('Two');
      await wrapper.setProps({ editorId: 'draft-2' });
      await wrapper.setProps({ isPrivate: true });
      await wrapper.setProps({ channelType: 'Channel::Email' });
      expect(view.state.doc.textContent).toBe('Two');
      await wrapper.setProps({ modelValue: undefined });
      expect(view.state.doc.textContent).toBe('');
    });

    it('ignores events and keys while disabled', async () => {
      mountEditor({ modelValue: 'Locked', disabled: true });
      domEvent('keyup', new KeyboardEvent('keyup'));
      domEvent('focus', new FocusEvent('focus'));
      domEvent('blur', new FocusEvent('blur'));
      expect(domEvent('keydown', new KeyboardEvent('keydown'))).toBeFalsy();
      domEvent('paste', { clipboardData: { files: [1] } });
      expect(wrapper.emitted('typingOn')).toBeUndefined();
      expect(wrapper.emitted('focus')).toBeUndefined();
      expect(wrapper.emitted('blur')).toBeUndefined();
      await wrapper.setProps({ disabled: false });
      expect(view.dom.getAttribute('contenteditable')).toBe('true');
    });

    it('replaces the selection with text from a parent', async () => {
      mountEditor({ modelValue: 'Hi' });
      await wrapper.setProps({ updateSelectionWith: ' friend' });
      expect(lastValue()).toBe('Hi friend');
      expect(wrapper.emitted('clearSelection')).toHaveLength(1);
      await wrapper.setProps({ updateSelectionWith: '' });
      expect(wrapper.emitted('clearSelection')).toHaveLength(1);
    });

    it('inserts bus content only when insert events are enabled', async () => {
      mountEditor({ modelValue: 'See ', enableInsertEvents: true });
      emitter.emit(
        BUS_EVENTS.INSERT_INTO_RICH_EDITOR,
        '[Docs](https://d.test)'
      );
      await nextTick();
      expect(lastValue()).toContain('[Docs](https://d.test)');
      wrapper.unmount();

      mountEditor({ modelValue: 'See ' });
      emitter.emit(BUS_EVENTS.INSERT_INTO_RICH_EDITOR, 'ignored');
      await nextTick();
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('focuses the start or end through the exposed method and shortcuts', () => {
      mountEditor({ modelValue: 'Some text', focusOnMount: false });
      wrapper.vm.focusEditorInputField('start');
      expect(view.state.selection.from).toBe(1);
      shortcuts['Alt+KeyP'].action();
      expect(view.state.selection.from).toBe(view.state.doc.content.size - 1);
    });
  });

  describe('keyboard', () => {
    const keydown = init =>
      new KeyboardEvent('keydown', { cancelable: true, ...init });

    it('collapses the selection on Escape', () => {
      mountEditor({ modelValue: 'Hello' });
      expect(domEvent('keydown', keydown({ key: 'Escape' }))).toBe(true);
    });

    it('keeps Cmd+Enter from adding a line when it sends', () => {
      mountEditor({ modelValue: 'Hello' });
      // jsdom is not an Apple platform, so the send modifier is Ctrl.
      const event = keydown({ key: 'Enter', ctrlKey: true });
      domEvent('keydown', event);
      expect(event.defaultPrevented).toBe(true);
    });

    it('lets the parent keep line breaks', () => {
      mountEditor({ modelValue: 'Hello', overrideLineBreaks: true });
      const event = keydown({ key: 'Enter', ctrlKey: true });
      domEvent('keydown', event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('suggestion pickers', () => {
    it('opens agent mentions in a private note and inserts the agent', async () => {
      mountEditor({ modelValue: '', isPrivate: true });
      await typeText('@ad');
      expect(wrapper.emitted('toggleUserMention').at(-1)).toEqual([true]);
      const picker = wrapper.findComponent({ name: 'TagAgents' });
      expect(picker.props()).toBeDefined();

      picker.vm.$emit('selectAgent', { id: 2, name: 'Ada' });
      await nextTick();
      expect(lastValue()).toContain('Ada');
      expect(useTrack).toHaveBeenCalled();
    });

    it('closes a picker and hands focus back to the editor', async () => {
      mountEditor({ modelValue: '', isPrivate: true });
      await typeText('@');
      wrapper.findComponent({ name: 'TagAgents' }).vm.$emit('close');
      await nextTick();
      expect(wrapper.findComponent({ name: 'TagAgents' }).exists()).toBe(false);
    });

    it('removes the trigger text when a picker asks', async () => {
      mountEditor({ modelValue: '', isPrivate: true });
      await typeText('@ada');
      wrapper.findComponent({ name: 'TagAgents' }).vm.$emit('removeTrigger');
      await nextTick();
      expect(view.state.doc.textContent).toBe('');
    });

    it('inserts canned responses on a reply', async () => {
      mountEditor({ modelValue: '' });
      await typeText('/thx');
      expect(wrapper.emitted('toggleCannedMenu').at(-1)).toEqual([true]);
      const picker = wrapper.findComponent({ name: 'CannedResponse' });
      picker.vm.$emit('replace', 'Thanks for writing in');
      await nextTick();
      expect(lastValue()).toContain('Thanks for writing in');
      picker.vm.$emit('close');
    });

    it('inserts variables when they are enabled', async () => {
      mountEditor({
        modelValue: '',
        enableVariables: true,
        variables: { 'contact.name': 'Ada' },
      });
      await typeText('{{con');
      expect(wrapper.emitted('toggleVariablesMenu').at(-1)).toEqual([true]);
      const picker = wrapper.findComponent({ name: 'VariableList' });
      picker.vm.$emit('selectVariable', 'contact.name');
      await nextTick();
      // Known variables are inserted with their value.
      expect(lastValue()).toContain('Ada');
      picker.vm.$emit('close');
    });

    it('runs a macro picked with #', async () => {
      mountEditor({ modelValue: '', enableMacros: true });
      await typeText('#close');
      expect(wrapper.emitted('toggleMacrosMenu').at(-1)).toEqual([true]);
      const picker = wrapper.findComponent({ name: 'MacroList' });
      picker.vm.$emit('selectMacro', { id: 4 });
      expect(wrapper.emitted('executeMacro')).toEqual([[{ id: 4 }]]);
      expect(view.state.doc.textContent).toBe('');
    });

    it('closes the macro picker', async () => {
      mountEditor({ modelValue: '', enableMacros: true });
      await typeText('#cl');
      wrapper.findComponent({ name: 'MacroList' }).vm.$emit('close');
      await nextTick();
      expect(wrapper.emitted('toggleMacrosMenu').at(-1)).toEqual([false]);
    });

    it('inserts an emoji after two characters', async () => {
      mountEditor({ modelValue: '' });
      await typeText(':sm');
      const picker = wrapper.findComponent({ name: 'KeyboardEmojiSelector' });
      picker.vm.$emit('selectEmoji', '😄');
      await nextTick();
      expect(lastValue()).toContain('😄');
    });

    it('closes the emoji and variable pickers', async () => {
      mountEditor({ modelValue: '', enableVariables: true });
      await typeText(':sm');
      wrapper
        .findComponent({ name: 'KeyboardEmojiSelector' })
        .vm.$emit('close');
      await typeText(' {{');
      wrapper.findComponent({ name: 'VariableList' }).vm.$emit('close');
      await nextTick();
      expect(wrapper.emitted('toggleVariablesMenu').at(-1)).toEqual([false]);
    });

    it('offers Captain tools for @ when they are enabled', async () => {
      mountEditor({ modelValue: '', enableCaptainTools: true });
      await typeText('@');
      expect(wrapper.emitted('toggleToolsMenu').at(-1)).toEqual([true]);
      wrapper
        .findComponent({ name: 'TagTools' })
        .vm.$emit('selectTool', { id: 'search', title: 'Search' });
      await nextTick();
      expect(useTrack).toHaveBeenCalled();
    });

    it('keeps @ as plain text on a reply and after exiting a suggestion', async () => {
      mountEditor({ modelValue: '' });
      await typeText('@ada ');
      expect(wrapper.findComponent({ name: 'TagAgents' }).exists()).toBe(false);
      await typeText('/x');
      await typeText(' ');
      expect(wrapper.emitted('toggleCannedMenu').at(-1)).toEqual([false]);
    });

    it('follows the search term as it is typed and closes canned responses', async () => {
      mountEditor({ modelValue: '' });
      await typeText('/th');
      await typeText('x');
      const picker = wrapper.findComponent({ name: 'CannedResponse' });
      expect(picker.attributes('search-key')).toBe('thx');
      picker.vm.$emit('close');
      await nextTick();
      expect(wrapper.emitted('toggleCannedMenu').at(-1)).toEqual([false]);
    });

    it('lets Enter pick a Captain tool instead of sending', async () => {
      mountEditor({ modelValue: '', enableCaptainTools: true });
      await typeText('@');
      const enter = new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter' });
      expect(view.someProp('handleKeyDown', f => f(view, enter))).toBe(true);
    });

    it('turns a typed variable into a variable node', async () => {
      mountEditor({
        modelValue: '',
        enableVariables: true,
        variables: { 'contact.name': 'Ada' },
      });
      await typeText('Hi {{contact.name}');
      const { from } = view.state.selection;
      view.someProp('handleTextInput', f => f(view, from, from, '}'));
      await nextTick();
      expect(lastValue()).toBe('Hi Ada');
    });

    it('has no pickers when suggestions are off', async () => {
      mountEditor({
        modelValue: '',
        enableSuggestions: false,
        isPrivate: true,
      });
      await typeText('@ada');
      expect(wrapper.emitted('toggleUserMention')).toBeUndefined();
    });
  });

  describe('signatures', () => {
    const signed = {
      allowSignature: true,
      channelType: 'Channel::WebWidget',
      signature: 'Best, Agent',
    };

    it('adds the signature when it is switched on and removes it when off', async () => {
      const { store } = mountEditor({ ...signed, modelValue: 'Hi' });
      store.commit('setUISettings', {
        channel_webwidget_signature_enabled: true,
      });
      await nextTick();
      expect(lastValue()).toContain('Best, Agent');

      await wrapper.setProps({ modelValue: lastValue() });
      store.commit('setUISettings', {
        channel_webwidget_signature_enabled: false,
      });
      await nextTick();
      expect(lastValue()).not.toContain('Best, Agent');
    });

    it('puts the cursor before the signature on an empty message', async () => {
      const { store } = mountEditor({ ...signed, modelValue: '' });
      store.commit('setUISettings', {
        channel_webwidget_signature_enabled: true,
      });
      await nextTick();
      expect(view.state.selection.from).toBe(1);
      expect(view.state.doc.firstChild.content.size).toBe(0);

      // Loading an empty, signed draft keeps the single empty paragraph.
      await wrapper.setProps({ modelValue: lastValue() });
      await wrapper.setProps({ editorId: 'other' });
      expect(view.state.doc.firstChild.content.size).toBe(0);
    });

    it('skips signature changes while disabled or without a signature', async () => {
      const store = buildStore({
        uiSettings: { channel_webwidget_signature_enabled: true },
      });
      mountEditor({ ...signed, signature: '', modelValue: 'Hi' }, { store });
      store.commit('setUISettings', {
        channel_webwidget_signature_enabled: false,
      });
      await nextTick();
      expect(lastValue()).toBe('Hi');
    });

    it('does not treat typed text matching the signature as empty when signatures are off', () => {
      mountEditor({ ...signed, modelValue: 'Best, Agent' });
      expect(view.state.doc.textContent).toBe('Best, Agent');
    });
  });

  describe('images', () => {
    const image = (size = 10) =>
      new File(['x'.repeat(size)], 'shot.png', { type: 'image/png' });
    const chooseFile = async file => {
      const input = wrapper.find('input[type="file"]');
      Object.defineProperty(input.element, 'files', {
        value: [file],
        configurable: true,
      });
      await input.trigger('change');
      await flushPromises();
    };

    it('uploads a chosen image and inserts it', async () => {
      uploadFile.mockResolvedValue({ fileUrl: 'https://cdn.test/shot.png' });
      mountEditor({
        modelValue: 'Logo',
        channelType: 'Context::MessageSignature',
      });
      await chooseFile(image());
      expect(lastValue()).toContain('https://cdn.test/shot.png');
      expect(useAlert).toHaveBeenCalledWith(
        'PROFILE_SETTINGS.FORM.MESSAGE_SIGNATURE_SECTION.IMAGE_UPLOAD_SUCCESS'
      );
    });

    it('opens the file browser from the image toolbar button', () => {
      mountEditor({
        modelValue: '',
        channelType: 'Context::MessageSignature',
      });
      const click = vi.spyOn(HTMLInputElement.prototype, 'click');
      const button = document.querySelector(
        '.ProseMirror-menubar [title*="mage"]'
      );
      expect(button).not.toBeNull();
      button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(click).toHaveBeenCalled();
      click.mockRestore();
    });

    it('alerts on upload errors, large files and missing urls', async () => {
      mountEditor({ modelValue: '', channelType: 'Channel::Email' });
      uploadFile.mockResolvedValueOnce({});
      await chooseFile(image());
      uploadFile.mockRejectedValueOnce(new Error('S3 down'));
      await chooseFile(image());
      await chooseFile({ name: 'big.png', size: 10 * 1024 * 1024 });
      await chooseFile(undefined);
      expect(useAlert.mock.calls.map(([message]) => message)).toEqual([
        'CONVERSATION.REPLYBOX.IMAGE_UPLOAD_SUCCESS',
        'PROFILE_SETTINGS.FORM.MESSAGE_SIGNATURE_SECTION.IMAGE_UPLOAD_ERROR',
        'PROFILE_SETTINGS.FORM.MESSAGE_SIGNATURE_SECTION.IMAGE_UPLOAD_SIZE_ERROR',
      ]);
    });

    it('pastes a clipboard image inline on email with Shift+Cmd+V', async () => {
      uploadFile.mockResolvedValue({ fileUrl: 'https://cdn.test/p.png' });
      const read = vi.fn().mockResolvedValue([
        { types: ['text/plain'] },
        {
          types: ['image/png'],
          getType: () => Promise.resolve(new Blob(['x'])),
        },
      ]);
      Object.defineProperty(navigator, 'clipboard', {
        value: { read },
        configurable: true,
      });
      mountEditor({ modelValue: 'Body', channelType: 'Channel::Email' });
      view.focus();
      vi.spyOn(view, 'hasFocus').mockReturnValue(true);
      await shortcuts['$mod+Shift+KeyV'].action();
      await flushPromises();
      expect(uploadFile).toHaveBeenCalled();

      read.mockResolvedValueOnce([{ types: ['text/plain'] }]);
      await shortcuts['$mod+Shift+KeyV'].action();
      read.mockRejectedValueOnce(new Error('NotAllowedError'));
      await shortcuts['$mod+Shift+KeyV'].action();
      expect(uploadFile).toHaveBeenCalledTimes(1);

      view.hasFocus.mockReturnValue(false);
      await shortcuts['$mod+Shift+KeyV'].action();
      expect(read).toHaveBeenCalledTimes(3);
    });

    it('does not read the clipboard on channels without inline images', async () => {
      const read = vi.fn();
      Object.defineProperty(navigator, 'clipboard', {
        value: { read },
        configurable: true,
      });
      mountEditor({ modelValue: '', channelType: 'Channel::Whatsapp' });
      vi.spyOn(view, 'hasFocus').mockReturnValue(true);
      await shortcuts['$mod+Shift+KeyV'].action();
      expect(read).not.toHaveBeenCalled();
    });
  });

  describe('pasting', () => {
    it('pastes the text that comes with files, and leaves plain pastes alone', () => {
      mountEditor({ modelValue: '' });
      const preventDefault = vi.fn();
      domEvent('paste', {
        preventDefault,
        clipboardData: { files: [{ size: 0 }], getData: () => 'A1\tB1' },
      });
      expect(preventDefault).toHaveBeenCalled();
      expect(lastValue()).toContain('A1');

      domEvent('paste', {
        preventDefault,
        clipboardData: { files: [{ size: 3 }], getData: () => '' },
      });
      expect(domEvent('paste', { clipboardData: { files: [] } })).toBeFalsy();
    });
  });

  describe('Copilot selection menu', () => {
    const captain = () =>
      buildStore({ features: ['captain_integration', 'captain_tasks'] });

    it('opens the menu from the toolbar and runs actions on the selection', async () => {
      mountEditor(
        { modelValue: 'Please fix this', channelType: 'Channel::Email' },
        { store: captain(), attrs: { class: 'popover-prosemirror-menu' } }
      );
      const button = document.querySelector('.ProseMirror-copilot');
      expect(button).not.toBeNull();
      button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await nextTick();
      const menu = wrapper.findComponent({ name: 'CopilotMenuBar' });
      expect(menu.exists()).toBe(true);
      expect(useTrack).toHaveBeenCalled();

      // Select "fix" and ask Copilot to improve it.
      // The cursor is a TextSelection; the package does not export the class.
      const TextSelection = view.state.selection.constructor;
      view.dispatch(
        view.state.tr.setSelection(TextSelection.create(view.state.doc, 8, 11))
      );
      await nextTick();
      expect(wrapper.element.classList.contains('has-selection')).toBe(true);

      button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await nextTick();
      wrapper
        .findComponent({ name: 'CopilotMenuBar' })
        .vm.$emit('executeCopilotAction', 'improve_selection');
      expect(wrapper.emitted('executeCopilotAction')).toEqual([
        ['improve', 'fix'],
      ]);

      button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await nextTick();
      wrapper
        .findComponent({ name: 'CopilotMenuBar' })
        .vm.$emit('executeCopilotAction', 'rephrase');
      expect(wrapper.emitted('executeCopilotAction').at(-1)).toEqual([
        'rephrase',
        'Please fix this',
      ]);

      // Clicks on the toolbar button keep the menu; clicks elsewhere close it.
      button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await nextTick();
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(wrapper.findComponent({ name: 'CopilotMenuBar' }).exists()).toBe(
        true
      );
      // vueuse handles one click per macrotask.
      await new Promise(resolve => {
        setTimeout(resolve, 0);
      });
      document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true })
      );
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await nextTick();
      expect(wrapper.findComponent({ name: 'CopilotMenuBar' }).exists()).toBe(
        false
      );
    });
  });
});
