/**
 * OneTeam behaviour spec for the deprecated WootInput field.
 *
 * Covers the optional label, help text, error and masked slot, typing
 * (input and model events), blur, and the readonly and style bindings.
 */
import { mount } from '@vue/test-utils';
import WootInput from '../Input.vue';

describe('WootInput behaviour', () => {
  it('renders extras and emits input and blur', async () => {
    const wrapper = mount(WootInput, {
      props: {
        label: 'Name',
        helpText: 'Your name',
        error: 'Required',
        modelValue: 'a',
        readonly: true,
        styles: { color: 'red' },
      },
      slots: { masked: '<b>mask</b>' },
    });
    expect(wrapper.text()).toContain('Name');
    expect(wrapper.find('.help-text').text()).toBe('Your name');
    expect(wrapper.find('.message').text()).toBe('Required');
    expect(wrapper.find('b').text()).toBe('mask');
    const input = wrapper.find('input');
    expect(input.attributes('readonly')).toBeDefined();
    expect(input.attributes('style')).toContain('color: red');
    await input.setValue('abc');
    await input.trigger('blur');
    expect(wrapper.emitted('input')).toEqual([['abc']]);
    expect(wrapper.emitted('update:modelValue')).toEqual([['abc']]);
    expect(wrapper.emitted('blur')).toEqual([['abc']]);
  });

  it('renders a bare input without a warning outside dev', () => {
    vi.stubEnv('DEV', false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = mount(WootInput);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    vi.unstubAllEnvs();
    expect(wrapper.find('span').exists()).toBe(false);
    expect(wrapper.find('p').exists()).toBe(false);
  });
});
