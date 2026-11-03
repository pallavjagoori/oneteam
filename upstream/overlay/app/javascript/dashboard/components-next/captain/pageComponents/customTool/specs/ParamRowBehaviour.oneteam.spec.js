/**
 * OneTeam behaviour spec for the custom tool ParamRow.
 *
 * Covers name validation, clearing errors on edit, the verified email
 * suggestion and the remove event.
 */
import { mount } from '@vue/test-utils';
import ParamRow from '../ParamRow.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const InputStub = {
  name: 'Input',
  props: { modelValue: [String, Number] },
  emits: ['update:modelValue'],
  template: '<input class="text" />',
};

/**
 * Mounts ParamRow with v-model props wired to setProps.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountRow = props => {
  const wrapper = mount(ParamRow, {
    props: {
      name: '',
      type: 'string',
      'onUpdate:name': value => wrapper.setProps({ name: value }),
      'onUpdate:type': value => wrapper.setProps({ type: value }),
      'onUpdate:description': value => wrapper.setProps({ description: value }),
      'onUpdate:required': value => wrapper.setProps({ required: value }),
      ...props,
    },
    global: {
      stubs: {
        Input: InputStub,
        ComboBox: {
          name: 'ComboBox',
          emits: ['update:modelValue'],
          template: '<div class="combo" />',
        },
        Checkbox: {
          name: 'Checkbox',
          emits: ['update:modelValue'],
          template: '<div class="check" />',
        },
        Button: {
          props: { icon: String, label: String },
          emits: ['click'],
          template:
            "<button :class=\"icon ? 'remove' : 'verified'\" @click=\"$emit('click', $event)\" />",
        },
      },
    },
  });
  return wrapper;
};

describe('ParamRow behaviour', () => {
  it('fails validation for a blank name and shows the error', async () => {
    const wrapper = mountRow({ name: '   ' });
    expect(wrapper.vm.validate()).toBe(false);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain(
      'CAPTAIN.CUSTOM_TOOLS.FORM.ERRORS.PARAM_NAME_REQUIRED'
    );
    expect(wrapper.find('div').classes()).toContain('animate-wiggle');
  });

  it('clears the error once a field changes', async () => {
    const wrapper = mountRow({});
    wrapper.vm.validate();
    await wrapper.vm.$nextTick();
    const inputs = wrapper.findAllComponents(InputStub);
    inputs[0].vm.$emit('update:modelValue', 'email');
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain('PARAM_NAME_REQUIRED');
    expect(wrapper.vm.validate()).toBe(true);
  });

  it('forwards type, description and required updates', async () => {
    const wrapper = mountRow({ name: 'q' });
    wrapper
      .findComponent({ name: 'ComboBox' })
      .vm.$emit('update:modelValue', 'number');
    wrapper
      .findAllComponents(InputStub)[1]
      .vm.$emit('update:modelValue', 'desc');
    wrapper
      .findComponent({ name: 'Checkbox' })
      .vm.$emit('update:modelValue', true);
    expect(wrapper.emitted('update:type')).toEqual([['number']]);
    expect(wrapper.emitted('update:description')).toEqual([['desc']]);
    expect(wrapper.emitted('update:required')).toEqual([[true]]);
  });

  it('emits remove and the verified email suggestion', async () => {
    const wrapper = mountRow({ name: 'email', suggestVerifiedEmail: true });
    expect(wrapper.text()).toContain(
      'CAPTAIN.CUSTOM_TOOLS.FORM.RISK.EMAIL_PARAM'
    );
    await wrapper.find('.remove').trigger('click');
    await wrapper.find('.verified').trigger('click');
    expect(wrapper.emitted('remove')).toHaveLength(1);
    expect(wrapper.emitted('useVerifiedEmail')).toHaveLength(1);
  });
});
