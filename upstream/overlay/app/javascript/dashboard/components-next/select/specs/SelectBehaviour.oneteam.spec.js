/**
 * OneTeam behaviour spec for the next-gen native select.
 *
 * Covers flat and grouped options, the placeholder, the error and
 * disabled outlines, the aria label, the prop validators, and updating
 * the model.
 */
import { mount } from '@vue/test-utils';
import Select from '../Select.vue';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta', disabled: true },
];

/**
 * Mounts the select.
 *
 * @param {object} props Select props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountSelect = props =>
  mount(Select, {
    props: { 'onUpdate:modelValue': () => {}, ...props },
    global: { stubs: { Icon: true } },
  });

describe('Select behaviour', () => {
  it('lists flat options with a placeholder and updates the model', async () => {
    const wrapper = mountSelect({
      options,
      placeholder: 'Pick one',
      ariaLabel: 'Letter',
    });
    const select = wrapper.get('select');
    expect(select.attributes('aria-label')).toBe('Letter');
    expect(select.classes()).toContain('outline-n-weak');
    const items = wrapper.findAll('option');
    expect(items.map(o => o.text())).toEqual(['Pick one', 'Alpha', 'Beta']);
    expect(items[2].element.disabled).toBe(true);
    await select.setValue('a');
    expect(wrapper.emitted('update:modelValue')).toEqual([['a']]);
  });

  it('lists grouped options and shows error and disabled states', () => {
    const grouped = mountSelect({
      groups: [{ label: 'Letters', options }],
      error: 'Required',
    });
    expect(grouped.get('optgroup').attributes('label')).toBe('Letters');
    expect(grouped.findAll('option')).toHaveLength(2);
    expect(grouped.get('select').classes()).toContain('outline-n-red-9');
    expect(grouped.get('select').attributes('aria-label')).toBeUndefined();
    const disabled = mountSelect({ options, disabled: true });
    expect(disabled.get('select').classes()).toContain('cursor-not-allowed');
  });

  it('validates option and group shapes', () => {
    const { options: optionProp, groups } = Select.props;
    expect(optionProp.validator(options)).toBe(true);
    expect(optionProp.validator([{ value: 1 }])).toBe(false);
    expect(groups.validator([{ label: 'G', options }])).toBe(true);
    expect(groups.validator([{ label: 'G', options: [{ value: 1 }] }])).toBe(
      false
    );
    expect(groups.validator([{ label: 'G' }])).toBe(false);
  });
});
