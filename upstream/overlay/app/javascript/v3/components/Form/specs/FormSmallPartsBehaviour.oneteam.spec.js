/**
 * Behaviour specs for the v3 CheckBox and WithLabel form parts.
 */
import { mount } from '@vue/test-utils';
import CheckBox from '../CheckBox.vue';
import WithLabel from '../WithLabel.vue';

describe('v3 CheckBox', () => {
  it('emits update with its value and the new state', async () => {
    const wrapper = mount(CheckBox, { props: { value: 'terms' } });
    await wrapper.find('input').setValue(true);
    expect(wrapper.emitted('update')[0]).toEqual(['terms', true]);
  });
});

describe('v3 WithLabel', () => {
  it('renders the help slot when no help message is given', () => {
    const wrapper = mount(WithLabel, {
      props: { name: 'email' },
      slots: { help: '<em>Use your work email</em>' },
    });
    expect(wrapper.find('em').text()).toBe('Use your work email');
  });

  it('renders the help message text', () => {
    const wrapper = mount(WithLabel, {
      props: { name: 'email', helpMessage: 'We never share it' },
    });
    expect(wrapper.text()).toContain('We never share it');
  });
});
