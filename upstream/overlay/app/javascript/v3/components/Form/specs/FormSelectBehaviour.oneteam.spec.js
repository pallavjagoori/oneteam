/**
 * OneTeam behaviour spec for the v3 (auth pages) form select.
 *
 * Covers the placeholder, rendering options or slot content, styling
 * for empty and chosen values, and emitting the chosen value.
 */
import { mount } from '@vue/test-utils';
import FormSelect from '../Select.vue';

describe('Form Select behaviour', () => {
  it('renders the placeholder and options and emits the choice', async () => {
    const wrapper = mount(FormSelect, {
      props: {
        label: 'Size',
        name: 'size',
        placeholder: 'Pick one',
        icon: 'i-x',
        options: [
          { value: 's', label: 'Small' },
          { value: 'l', label: 'Large' },
        ],
      },
    });
    const options = wrapper.findAll('option');
    expect(options.map(o => o.text())).toEqual(['Pick one', 'Small', 'Large']);
    const select = wrapper.get('select');
    expect(select.classes()).toEqual(
      expect.arrayContaining(['text-n-slate-9', 'pl-9'])
    );
    select.element.value = 'l';
    await select.trigger('input');
    expect(wrapper.emitted('update:modelValue')).toEqual([['l']]);
  });

  it('uses slot options and highlights a chosen value', () => {
    const wrapper = mount(FormSelect, {
      props: { label: 'Size', name: 'size', modelValue: 'x' },
      slots: { default: '<option value="x">Custom</option>' },
    });
    expect(wrapper.findAll('option')).toHaveLength(2);
    expect(wrapper.get('select').classes()).toContain('text-n-slate-12');
    expect(FormSelect.props.options.default()).toEqual([]);
  });
});
