/**
 * OneTeam behaviour spec for the inline input.
 *
 * Covers the optional label and prefix slot, typing (input and model
 * update), focus, blur, Enter and Escape events, focusing on mount, and
 * the exposed focus and blur helpers.
 */
import { mount, flushPromises } from '@vue/test-utils';
import InlineInput from '../InlineInput.vue';

describe('InlineInput behaviour', () => {
  it('renders a label and emits input events', async () => {
    const wrapper = mount(InlineInput, {
      props: {
        id: 'x',
        label: 'Name',
        modelValue: 'a',
        'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
      },
      slots: { prefix: '<b>#</b>' },
    });
    expect(wrapper.find('label').text()).toBe('Name');
    expect(wrapper.find('b').text()).toBe('#');
    const input = wrapper.find('input');
    await input.setValue('abc');
    expect(wrapper.emitted('input')).toContainEqual(['abc']);
    expect(wrapper.props('modelValue')).toBe('abc');
    await input.trigger('focus');
    await input.trigger('blur');
    await input.trigger('keydown', { key: 'Enter' });
    await input.trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('focus')).toEqual([['abc']]);
    expect(wrapper.emitted('blur')).toEqual([['abc']]);
    expect(wrapper.emitted('enterPress')).toHaveLength(1);
    expect(wrapper.emitted('escapePress')).toHaveLength(1);
  });

  it('focuses on mount and exposes focus and blur', async () => {
    const wrapper = mount(InlineInput, {
      props: { focusOnMount: true },
      attachTo: document.body,
    });
    await flushPromises();
    const input = wrapper.find('input').element;
    expect(document.activeElement).toBe(input);
    expect(wrapper.find('label').exists()).toBe(false);
    wrapper.vm.blur();
    expect(document.activeElement).not.toBe(input);
    wrapper.vm.focus();
    expect(document.activeElement).toBe(input);
    wrapper.unmount();

    const plain = mount(InlineInput);
    await flushPromises();
    plain.vm.focus();
    plain.unmount();
    expect(() => plain.vm.blur()).not.toThrow();
  });
});
