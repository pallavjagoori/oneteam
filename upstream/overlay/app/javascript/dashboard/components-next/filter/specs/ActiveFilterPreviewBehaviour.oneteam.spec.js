/**
 * OneTeam behaviour spec for the applied filters summary.
 *
 * Covers each visible filter's attribute, readable operator and value
 * (lists, named objects, plain values, or none), the and/or joiner
 * between visible filters, the "more filters" link past the visible
 * limit, opening the filter editor, and the optional clear button.
 */
import { mount } from '@vue/test-utils';
import ActiveFilterPreview from '../ActiveFilterPreview.vue';

const Button = {
  name: 'Button',
  props: { label: String },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const filters = [
  {
    attributeKey: 'assignee_id',
    filterOperator: 'equal_to',
    values: [{ name: 'Ann' }, 'Bo', null],
    queryOperator: 'and',
  },
  {
    attributeKey: 'email',
    filterOperator: 'starts_with',
    values: { name: 'a@b.co' },
    queryOperator: 'or',
  },
  { attributeKey: 'city', filterOperator: 'is_present', values: null },
];

const mountPreview = (props = {}) =>
  mount(ActiveFilterPreview, {
    props: {
      appliedFilters: filters,
      clearButtonLabel: 'Clear',
      moreFiltersLabel: '+1 more',
      ...props,
    },
    global: { stubs: { Button } },
  });

const chips = wrapper =>
  wrapper
    .findAll('.max-w-72')
    .map(chip => chip.findAll('span').map(s => s.text()));

describe('ActiveFilterPreview behaviour', () => {
  it('shows the visible filters with readable operators and values', () => {
    const wrapper = mountPreview();
    expect(chips(wrapper)).toEqual([
      ['assignee id', 'is', 'Ann, Bo,'],
      ['email', 'starts with', 'a@b.co'],
    ]);
    const values = wrapper.findAll('span[title]');
    expect(values[0].classes()).toContain('first-letter:capitalize');
    expect(values[1].classes()).not.toContain('first-letter:capitalize');
    expect(wrapper.findAll('.uppercase').map(s => s.text())).toEqual(['and']);
    expect(wrapper.text()).toContain('+1 more');
  });

  it('shows every filter within the limit, including empty values', () => {
    const wrapper = mountPreview({ maxVisibleFilters: 3 });
    expect(chips(wrapper)[2]).toEqual(['city', 'is present']);
    expect(wrapper.findAll('.uppercase').map(s => s.text())).toEqual([
      'and',
      'or',
    ]);
    expect(wrapper.text()).not.toContain('+1 more');

    const plain = mountPreview({
      appliedFilters: [
        { attributeKey: 'id', filterOperator: 'is_less_than', values: 5 },
        { attributeKey: 'x', filterOperator: 'contains', values: '' },
      ],
    });
    expect(chips(plain)).toEqual([
      ['id', 'is less than', '5'],
      ['x', 'contains'],
    ]);
    // The template hides empty values, so the guard is checked directly.
    expect(plain.vm.formatFilterValue(undefined)).toBe('');
  });

  it('opens the filter editor and clears filters', async () => {
    const wrapper = mountPreview();
    await wrapper.find('.max-w-72').trigger('click');
    await wrapper.find('.h-7.text-n-slate-10').trigger('click');
    expect(wrapper.emitted('openFilter')).toHaveLength(2);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('clearFilters')).toHaveLength(1);

    const noClear = mountPreview({ showClearButton: false });
    expect(noClear.find('button').exists()).toBe(false);
    expect(noClear.find('.w-px').exists()).toBe(false);
    expect(mount(ActiveFilterPreview).findAll('.max-w-72')).toHaveLength(0);
  });
});
