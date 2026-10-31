/**
 * OneTeam behaviour spec for the shared textarea.
 *
 * Covers the label, character count and max length, message colours,
 * focus and blur (ignored while disabled), auto height on mount, input
 * and value changes, autofocus, resize classes, and adding or removing
 * the signature with the cursor placed before it.
 */
import { mount, flushPromises } from '@vue/test-utils';
import {
  appendSignature,
  extractTextFromMarkdown,
  removeSignature,
} from 'dashboard/helper/editorHelper';
import TextArea from '../TextArea.vue';

const mountArea = (props = {}) =>
  mount(TextArea, { props, attachTo: document.body });
const area = wrapper => wrapper.find('textarea');
const box = wrapper => wrapper.find('textarea').element.parentElement;

describe('TextArea behaviour', () => {
  let wrapper;
  afterEach(() => wrapper?.unmount());

  it('renders the label, count and message colours', async () => {
    wrapper = mountArea({
      id: 'notes',
      label: 'Notes',
      modelValue: 'Hello',
      showCharacterCount: true,
      maxLength: 50,
      message: 'Saved',
      messageType: 'success',
    });
    expect(wrapper.find('label').attributes('for')).toBe('notes');
    expect(area(wrapper).attributes('maxlength')).toBe('50');
    expect(wrapper.text()).toContain('5 / 50');
    expect(wrapper.find('p').classes()).toContain('text-n-teal-10');
    await wrapper.setProps({ messageType: 'error' });
    expect(wrapper.find('p').classes()).toContain('text-n-ruby-9');
    expect(box(wrapper).className).toContain('border-n-ruby-8');
    await wrapper.setProps({ messageType: 'info' });
    expect(wrapper.find('p').classes()).toContain('text-n-slate-11');
  });

  it('omits optional parts by default', () => {
    wrapper = mountArea();
    expect(wrapper.find('label').exists()).toBe(false);
    expect(wrapper.find('p').exists()).toBe(false);
    expect(area(wrapper).attributes('maxlength')).toBeUndefined();
    expect(area(wrapper).classes()).toContain('resize-none');
    expect(
      mountArea({ resize: true }).find('textarea').classes()
    ).not.toContain('resize-none');
  });

  it('emits input, focus and blur', async () => {
    wrapper = mountArea();
    await area(wrapper).setValue('Typed');
    expect(wrapper.emitted('update:modelValue')).toEqual([['Typed']]);
    await area(wrapper).trigger('focus');
    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(box(wrapper).className).toContain('border-n-brand');
    await area(wrapper).trigger('blur');
    expect(wrapper.emitted('blur')).toHaveLength(1);
    expect(box(wrapper).className).not.toContain('border-n-brand');
  });

  it('ignores focus and blur while disabled', async () => {
    wrapper = mountArea({ disabled: true });
    await area(wrapper).trigger('focus');
    await area(wrapper).trigger('blur');
    expect(wrapper.emitted('focus')).toBeUndefined();
    expect(wrapper.emitted('blur')).toBeUndefined();
    expect(box(wrapper).className).toContain('cursor-not-allowed');
  });

  it('grows with its content and focuses itself', async () => {
    vi.spyOn(
      HTMLTextAreaElement.prototype,
      'scrollHeight',
      'get'
    ).mockReturnValue(88);
    wrapper = mountArea({
      autoHeight: true,
      autofocus: true,
      minHeight: '2rem',
    });
    await flushPromises();
    expect(area(wrapper).element.style.height).toBe('88px');
    expect(area(wrapper).element.style.minHeight).toBe('2rem');
    expect(document.activeElement).toBe(area(wrapper).element);
    area(wrapper).element.style.height = '1px';
    await area(wrapper).setValue('More');
    await flushPromises();
    expect(area(wrapper).element.style.height).toBe('88px');
    area(wrapper).element.style.height = '1px';
    await wrapper.setProps({ modelValue: 'Changed' });
    await flushPromises();
    expect(area(wrapper).element.style.height).toBe('88px');
  });

  it('does not resize without auto height', async () => {
    wrapper = mountArea();
    await area(wrapper).setValue('Text');
    await wrapper.setProps({ modelValue: 'Text' });
    await flushPromises();
    expect(area(wrapper).element.style.height).toBe('');
  });

  it('adds and removes the signature when allowed', async () => {
    const signature = '**Jane** from Support';
    const clean = extractTextFromMarkdown(signature);
    wrapper = mountArea({
      modelValue: 'Hi there',
      signature,
      allowSignature: true,
      autoHeight: true,
    });
    await wrapper.setProps({ sendWithSignature: true });
    const withSignature = appendSignature('Hi there', clean);
    expect(wrapper.emitted('update:modelValue')).toEqual([[withSignature]]);
    await flushPromises();
    expect(document.activeElement).toBe(area(wrapper).element);
    expect(area(wrapper).element.selectionStart).toBe('Hi there'.length);
    await wrapper.setProps({ modelValue: withSignature });

    await wrapper.setProps({ sendWithSignature: false });
    expect(wrapper.emitted('update:modelValue')[1]).toEqual([
      removeSignature(withSignature, clean),
    ]);
  });

  it('ignores signature toggles when not allowed', async () => {
    wrapper = mountArea({ signature: 'Sig' });
    await wrapper.setProps({ sendWithSignature: true });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.vm.$.setupState.toggleSignatureInEditor(true);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('skips height and cursor work once the textarea is gone', async () => {
    wrapper = mountArea({ allowSignature: true, autoHeight: true });
    const { setupState } = wrapper.vm.$;
    setupState.textareaRef = null;
    setupState.toggleSignatureInEditor(true);
    await flushPromises();
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
  });
});
