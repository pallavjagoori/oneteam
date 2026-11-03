/**
 * OneTeam behaviour spec for the custom tool auth config fields.
 *
 * Covers the fields for each auth type, writing them into the auth config
 * model, resetting the config when the type changes, and the type validator.
 */
import { mount } from '@vue/test-utils';
import AuthConfig from '../AuthConfig.vue';

const Input = {
  name: 'Input',
  props: ['modelValue', 'label'],
  emits: ['update:modelValue'],
  template: '<input :data-label="label" />',
};

/**
 * Mounts the fields for an auth type.
 *
 * @param {string} authType - The auth type.
 * @param {object} authConfig - The starting config.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountFields = (authType, authConfig = {}) =>
  mount(AuthConfig, {
    props: { authType, authConfig },
    global: { stubs: { Input } },
  });

const labels = wrapper =>
  wrapper.findAllComponents(Input).map(input => input.props('label'));

describe('AuthConfig behaviour', () => {
  it('shows the fields for each auth type and writes them to the config', () => {
    const config = {};
    let wrapper = mountFields('bearer', config);
    expect(labels(wrapper)).toEqual([
      'CAPTAIN.CUSTOM_TOOLS.FORM.AUTH_CONFIG.BEARER_TOKEN',
    ]);
    wrapper.getComponent(Input).vm.$emit('update:modelValue', 'tok');
    expect(config.token).toBe('tok');

    const basic = {};
    wrapper = mountFields('basic', basic);
    const [user, pass] = wrapper.findAllComponents(Input);
    user.vm.$emit('update:modelValue', 'ann');
    pass.vm.$emit('update:modelValue', 'secret');
    expect(basic).toEqual({ username: 'ann', password: 'secret' });

    const apiKey = {};
    wrapper = mountFields('api_key', apiKey);
    const [name, key] = wrapper.findAllComponents(Input);
    name.vm.$emit('update:modelValue', 'X-Key');
    key.vm.$emit('update:modelValue', 'abc');
    expect(apiKey).toEqual({ name: 'X-Key', key: 'abc' });

    wrapper = mountFields('none');
    expect(labels(wrapper)).toEqual([]);
  });

  it('resets the config when the auth type changes', async () => {
    const wrapper = mountFields('bearer', { token: 'tok' });
    await wrapper.setProps({ authType: 'basic' });
    expect(wrapper.emitted('update:authConfig')).toEqual([[{}]]);
  });

  it('validates the auth type', () => {
    const { validator } = AuthConfig.props.authType;
    expect(validator('basic')).toBe(true);
    expect(validator('oauth')).toBe(false);
  });
});
