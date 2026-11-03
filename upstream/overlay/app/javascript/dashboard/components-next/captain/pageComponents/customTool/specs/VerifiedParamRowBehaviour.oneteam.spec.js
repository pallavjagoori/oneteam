/**
 * OneTeam behaviour spec for the custom tool VerifiedParamRow.
 *
 * Covers validation of a missing name, clearing errors on edit, the
 * name v-model, and removing the row.
 */
import { mount } from '@vue/test-utils';
import VerifiedParamRow from '../VerifiedParamRow.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const InputStub = {
  name: 'Input',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input />',
};

/**
 * Mounts the row.
 *
 * @param {string} name parameter name
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountRow = name =>
  mount(VerifiedParamRow, {
    props: {
      name,
      'onUpdate:name': value => {
        // eslint-disable-next-line no-use-before-define
        wrapper.setProps({ name: value });
      },
    },
    global: {
      stubs: {
        Input: InputStub,
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\', $event)" />',
        },
      },
    },
  });

let wrapper;

describe('VerifiedParamRow behaviour', () => {
  it('flags a blank name and clears the error after editing', async () => {
    wrapper = mountRow('  ');
    expect(wrapper.vm.validate()).toBe(false);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain(
      'CAPTAIN.CUSTOM_TOOLS.FORM.ERRORS.PARAM_NAME_REQUIRED'
    );
    wrapper.findComponent(InputStub).vm.$emit('update:modelValue', 'email');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain('PARAM_NAME_REQUIRED');
    expect(wrapper.vm.validate()).toBe(true);
  });

  it('treats an empty name as missing and emits remove', async () => {
    wrapper = mountRow('');
    expect(wrapper.vm.validate()).toBe(false);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('remove')).toHaveLength(1);
  });
});
