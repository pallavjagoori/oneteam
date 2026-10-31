/**
 * OneTeam behaviour spec for the auto-growing reply text area.
 *
 * Uses the real signature helpers and typing indicator. Covers focus
 * and sizing on mount, growing with content, cursor placement before
 * the signature, adding and removing the signature (only when allowed),
 * typing on and off events, and the input, focus and blur events.
 */
import { mount, flushPromises } from '@vue/test-utils';
import ResizableTextArea from '../ResizableTextArea.vue';

let wrapper;

const mountArea = async (props = {}) => {
  wrapper = mount(ResizableTextArea, { props, attachTo: document.body });
  await flushPromises();
  return wrapper;
};

const area = () => wrapper.find('textarea').element;

describe('ResizableTextArea behaviour', () => {
  afterEach(() => {
    wrapper.unmount();
    vi.useRealTimers();
  });

  it('focuses an empty box and uses the minimum height', async () => {
    await mountArea({ minHeight: 3, placeholder: 'Reply', rows: 4 });
    expect(document.activeElement).toBe(area());
    expect(area().getAttribute('rows')).toBe('4');
    await wrapper.setProps({ modelValue: 'x' });
    await wrapper.setProps({ modelValue: '' });
    expect(area().style.height).toBe('3rem');
  });

  it('sizes to content and puts the cursor before the signature', async () => {
    await mountArea({
      modelValue: 'Hello\n\n--\n\nBest, Ann',
      signature: '**Best, Ann**',
    });
    expect(area().style.height).toBe(`${area().scrollHeight}px`);
    expect(area().selectionStart).toBe(5);

    area().blur();
    await wrapper.setProps({ modelValue: 'Hello there\n\n--\n\nBest, Ann' });
    await flushPromises();
    expect(area().selectionStart).toBe(11);

    // While the user is typing the cursor is left alone.
    area().focus();
    const select = vi.spyOn(area(), 'setSelectionRange');
    await wrapper.setProps({ modelValue: 'Hel lo there\n\n--\n\nBest, Ann' });
    await flushPromises();
    expect(select).not.toHaveBeenCalled();
  });

  it('adds and removes the signature only when allowed', async () => {
    await mountArea({
      modelValue: 'Hi',
      signature: 'Ann',
      allowSignature: false,
    });
    await wrapper.setProps({ sendWithSignature: true });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await wrapper.setProps({ allowSignature: true, sendWithSignature: false });
    await wrapper.setProps({ sendWithSignature: true });
    const added = wrapper.emitted('update:modelValue').at(-1)[0];
    expect(added).toBe('Hi\n\n--\n\nAnn');
    expect(wrapper.emitted('input').at(-1)[0]).toBe(added);

    await wrapper.setProps({ modelValue: added });
    await wrapper.setProps({ sendWithSignature: false });
    await flushPromises();
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toBe('Hi\n\n');

    await wrapper.setProps({
      modelValue: '\n\n--\n\nAnn',
      sendWithSignature: true,
    });
    await wrapper.setProps({ sendWithSignature: false });
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toBe('');
  });

  it('emits input, focus, blur and typing events', async () => {
    vi.useFakeTimers();
    await mountArea();
    await wrapper.find('textarea').setValue('typed');
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['typed']);
    expect(wrapper.emitted('input')[0]).toEqual(['typed']);

    await wrapper.find('textarea').trigger('keyup');
    expect(wrapper.emitted('typingOn')).toBeTruthy();
    vi.advanceTimersByTime(4000);
    const offs = wrapper.emitted('typingOff').length;

    await wrapper.find('textarea').trigger('keyup');
    await wrapper.find('textarea').trigger('blur');
    expect(wrapper.emitted('typingOff').length).toBeGreaterThan(offs);
    expect(wrapper.emitted('blur')).toBeTruthy();
    const focuses = wrapper.emitted('focus')?.length || 0;
    await wrapper.find('textarea').trigger('focus');
    expect(wrapper.emitted('focus')).toHaveLength(focuses + 1);
  });

  it('ignores focus and cursor requests without the textarea', async () => {
    await mountArea({ modelValue: 'Hi' });
    const { vm } = wrapper;
    Object.defineProperty(vm.$refs, 'textarea', {
      value: null,
      configurable: true,
    });
    vm.focus();
    vm.setCursor();
    expect(wrapper.exists()).toBe(true);
  });
});
