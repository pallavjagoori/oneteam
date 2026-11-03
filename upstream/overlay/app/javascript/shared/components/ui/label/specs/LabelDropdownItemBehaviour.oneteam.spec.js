/**
 * OneTeam behaviour spec for a label dropdown row: colour dot, selected
 * check icon and the select event.
 */
import { mount } from '@vue/test-utils';
import LabelDropdownItem from '../LabelDropdownItem.vue';

const NextButton = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')"><slot /></button>',
};
const global = {
  stubs: { NextButton, WootDropdownItem: { template: '<li><slot /></li>' } },
};

describe('LabelDropdownItem', () => {
  it('shows the check and colour for a selected label and emits its title', async () => {
    const wrapper = mount(LabelDropdownItem, {
      props: { title: 'billing', color: '#ff0000', selected: true },
      global,
    });
    expect(wrapper.find('button').attributes('data-icon')).toBe(
      'i-lucide-circle-check'
    );
    expect(wrapper.find('.rounded-full').exists()).toBe(true);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('selectLabel')).toEqual([['billing']]);
  });

  it('hides the check and colour when not selected and uncoloured', () => {
    const wrapper = mount(LabelDropdownItem, {
      props: { title: 'support' },
      global,
    });
    expect(wrapper.find('button').attributes('data-icon')).toBe('');
    expect(wrapper.find('.rounded-full').exists()).toBe(false);
  });
});
