/**
 * OneTeam behaviour spec for the profile access token field.
 *
 * Covers masking and unmasking the token, copying it, resetting it,
 * and hiding the reset button.
 */
import { mount } from '@vue/test-utils';
import AccessToken from '../AccessToken.vue';

const WootInput = {
  name: 'WootInput',
  props: ['type', 'modelValue'],
  template: '<div class="input"><slot name="masked" /></div>',
};
const FluentIcon = { name: 'FluentIcon', props: ['icon'], template: '<i />' };
const NextButton = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="copy" />',
};
const ConfirmButton = {
  name: 'ConfirmButton',
  emits: ['click'],
  template: '<button class="reset" />',
};

/**
 * Mounts the field with stubbed inputs and buttons.
 *
 * @param {object} props Component props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountToken = (props = {}) =>
  mount(AccessToken, {
    props: { value: 'secret', ...props },
    global: {
      stubs: { WootInput, FluentIcon, NextButton, ConfirmButton },
      mocks: { $t: key => key },
    },
  });

describe('AccessToken behaviour', () => {
  it('masks and unmasks the token', async () => {
    const wrapper = mountToken();
    const input = wrapper.getComponent(WootInput);
    expect(input.props()).toEqual({ type: 'password', modelValue: 'secret' });
    expect(wrapper.getComponent(FluentIcon).props('icon')).toBe('eye-hide');
    await wrapper.get('.input button').trigger('click');
    expect(input.props('type')).toBe('text');
    expect(wrapper.getComponent(FluentIcon).props('icon')).toBe('eye-show');
    await wrapper.get('.input button').trigger('click');
    expect(input.props('type')).toBe('password');
  });

  it('copies and resets the token', () => {
    const wrapper = mountToken();
    wrapper.getComponent(NextButton).vm.$emit('click');
    wrapper.getComponent(ConfirmButton).vm.$emit('click');
    expect(wrapper.emitted('onCopy')).toEqual([['secret']]);
    expect(wrapper.emitted('onReset')).toHaveLength(1);
  });

  it('hides the reset button when asked', () => {
    const wrapper = mountToken({ showResetButton: false });
    expect(wrapper.findComponent(ConfirmButton).exists()).toBe(false);
  });
});
