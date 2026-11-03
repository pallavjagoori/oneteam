/**
 * OneTeam behaviour spec for the next-gen checkbox.
 *
 * Covers the checked, indeterminate and disabled states and updating
 * the model on change.
 */
import { mount } from '@vue/test-utils';
import Checkbox from '../Checkbox.vue';

describe('Checkbox behaviour', () => {
  it('reflects its state and updates the model', async () => {
    const wrapper = mount(Checkbox, {
      props: { indeterminate: true, 'onUpdate:modelValue': () => {} },
    });
    const input = wrapper.get('input');
    expect(input.element.checked).toBe(false);
    expect(input.element.indeterminate).toBe(true);
    await input.setValue(true);
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    expect(wrapper.emitted('change')).toHaveLength(1);
  });

  it('can start checked and disabled', () => {
    const input = mount(Checkbox, {
      props: { modelValue: true, disabled: true },
    }).get('input');
    expect(input.element.checked).toBe(true);
    expect(input.element.disabled).toBe(true);
  });
});
