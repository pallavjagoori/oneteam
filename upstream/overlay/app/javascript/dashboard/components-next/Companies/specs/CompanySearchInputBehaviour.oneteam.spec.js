/**
 * OneTeam behaviour spec for the companies search box.
 */
import { mount } from '@vue/test-utils';
import CompanySearchInput from '../CompanySearchInput.vue';

const Input = {
  name: 'Input',
  props: ['modelValue', 'type', 'placeholder', 'size'],
  emits: ['update:modelValue'],
  template: '<div><slot name="prefix" /><input /></div>',
};

describe('CompanySearchInput behaviour', () => {
  it('searches with an icon prefix', () => {
    const wrapper = mount(CompanySearchInput, {
      props: {
        placeholder: 'Search companies',
        modelValue: 'ac',
        'onUpdate:modelValue': () => {},
      },
      global: { stubs: { Input, Icon: { template: '<i class="icon" />' } } },
    });
    const input = wrapper.getComponent(Input);
    expect(input.props()).toEqual({
      modelValue: 'ac',
      type: 'search',
      placeholder: 'Search companies',
      size: 'sm',
    });
    expect(wrapper.find('.icon').exists()).toBe(true);
    input.vm.$emit('update:modelValue', 'acme');
    expect(wrapper.emitted('update:modelValue')).toEqual([['acme']]);
  });
});
