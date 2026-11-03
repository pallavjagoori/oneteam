/**
 * OneTeam behaviour spec for the next-gen text input.
 *
 * Covers the label and generated id, size classes, error and success
 * messages, number conversion, focus/blur/enter events, min and max on
 * date and number inputs, and autofocus.
 */
import { mount } from '@vue/test-utils';
import Input from '../Input.vue';

describe('Input behaviour', () => {
  it('labels the input and styles it by size and message type', async () => {
    const wrapper = mount(Input, {
      props: {
        label: 'Name',
        size: 'sm',
        message: 'Bad',
        messageType: 'error',
      },
    });
    const input = wrapper.get('input');
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'));
    expect(input.attributes('id')).toMatch(/^input-/);
    expect(input.classes()).toContain('h-8');
    expect(input.classes()).toContain('error');
    expect(wrapper.get('p').classes()).toContain('text-n-ruby-9');
    await wrapper.setProps({ size: 'md', messageType: 'success', id: 'nm' });
    expect(input.classes()).toContain('h-10');
    expect(input.attributes('id')).toBe('nm');
    expect(wrapper.get('p').classes()).toContain('text-n-teal-10');
    await wrapper.setProps({ size: 'xl', messageType: 'info' });
    expect(input.classes()).toContain('h-10');
    expect(wrapper.get('p').classes()).toContain('text-n-slate-11');
  });

  it('emits values, focus, blur and enter', async () => {
    const wrapper = mount(Input, { props: { type: 'number' } });
    const input = wrapper.get('input');
    await input.setValue('42');
    await input.setValue('');
    expect(wrapper.emitted('update:modelValue')).toEqual([[42], ['']]);
    expect(wrapper.emitted('input')).toHaveLength(2);
    await input.trigger('focus');
    expect(input.classes()).toContain('focus');
    await input.trigger('blur');
    expect(input.classes()).not.toContain('focus');
    await input.trigger('keyup.enter');
    expect(wrapper.emitted()).toHaveProperty('focus');
    expect(wrapper.emitted()).toHaveProperty('blur');
    expect(wrapper.emitted('enter')).toHaveLength(1);
  });

  it('keeps text values as strings', async () => {
    const wrapper = mount(Input);
    await wrapper.get('input').setValue('7');
    expect(wrapper.emitted('update:modelValue')).toEqual([['7']]);
  });

  it('applies min and max only to supported types', async () => {
    const wrapper = mount(Input, {
      props: { type: 'date', min: '2026-01-01', max: '2026-12-31' },
    });
    const input = wrapper.get('input');
    expect(input.attributes()).toMatchObject({
      min: '2026-01-01',
      max: '2026-12-31',
    });
    await wrapper.setProps({ type: 'number', min: '1', max: '9' });
    expect(input.attributes('min')).toBeUndefined();
    expect(input.attributes('max')).toBe('9');
    await wrapper.setProps({ type: 'text' });
    expect(input.attributes('max')).toBeUndefined();
  });

  it('focuses itself when autofocus is set', async () => {
    const wrapper = mount(Input, {
      props: { autofocus: true },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(wrapper.get('input').element);
    wrapper.unmount();
  });
});
