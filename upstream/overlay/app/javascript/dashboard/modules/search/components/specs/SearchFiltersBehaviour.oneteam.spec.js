/**
 * OneTeam behaviour spec for the search filter bar.
 *
 * Covers the clear button appearing for any active filter, clearing all
 * filters, writing selector v-model updates, and forwarding date range,
 * contact/agent and inbox changes.
 */
import { mount } from '@vue/test-utils';
import SearchFilters from '../SearchFilters.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const selector = name => ({
  name,
  props: ['modelValue', 'label'],
  emits: ['change', 'update:modelValue'],
  template: `<div class="${name}" />`,
});
const SearchDateRangeSelector = selector('SearchDateRangeSelector');
const SearchContactAgentSelector = selector('SearchContactAgentSelector');
const SearchInboxSelector = selector('SearchInboxSelector');
const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button class="clear" @click="$emit(\'click\')" />',
};

const emptyRange = { type: null, from: null, to: null };

/**
 * Mounts the filter bar with the given model value.
 *
 * @param {object} modelValue Current filters.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountFilters = modelValue =>
  mount(SearchFilters, {
    props: modelValue ? { modelValue } : {},
    global: {
      stubs: {
        SearchDateRangeSelector,
        SearchContactAgentSelector,
        SearchInboxSelector,
        Button,
      },
      mocks: { $t: key => key },
    },
  });

describe('SearchFilters behaviour', () => {
  it('writes selector v-model updates into the filters', async () => {
    const filters = { from: null, in: null, dateRange: { ...emptyRange } };
    const wrapper = mountFilters(filters);
    const range = { type: 'custom', from: 1, to: 2 };
    wrapper
      .getComponent(SearchDateRangeSelector)
      .vm.$emit('update:modelValue', range);
    wrapper
      .getComponent(SearchContactAgentSelector)
      .vm.$emit('update:modelValue', 5);
    wrapper.getComponent(SearchInboxSelector).vm.$emit('update:modelValue', 6);
    await wrapper.vm.$nextTick();
    expect(
      wrapper.getComponent(SearchDateRangeSelector).props('modelValue')
    ).toEqual(range);
    expect(
      wrapper.getComponent(SearchContactAgentSelector).props('modelValue')
    ).toBe(5);
    expect(wrapper.getComponent(SearchInboxSelector).props('modelValue')).toBe(
      6
    );
  });

  it('hides the clear button without filters and forwards changes', () => {
    const filters = { from: null, in: null, dateRange: { ...emptyRange } };
    const wrapper = mountFilters(filters);
    expect(wrapper.find('.clear').exists()).toBe(false);
    wrapper.getComponent(SearchContactAgentSelector).vm.$emit('change');
    wrapper.getComponent(SearchInboxSelector).vm.$emit('change');
    wrapper.getComponent(SearchDateRangeSelector).vm.$emit('change');
    expect(wrapper.emitted('updateFilters')).toEqual([
      [filters],
      [filters],
      [filters],
    ]);
  });

  it.each([
    ['a contact', { from: 3, in: null, dateRange: { ...emptyRange } }],
    ['an inbox', { from: null, in: 2, dateRange: { ...emptyRange } }],
    ['a range type', { from: null, in: null, dateRange: { type: 'custom' } }],
    ['a start date', { from: null, in: null, dateRange: { from: 1 } }],
    ['an end date', { from: null, in: null, dateRange: { to: 2 } }],
  ])('offers to clear %s', (_label, filters) => {
    expect(mountFilters(filters).findAll('.clear')).toHaveLength(2);
  });

  it('starts with empty filters by default', () => {
    const wrapper = mountFilters(null);
    expect(wrapper.find('.clear').exists()).toBe(false);
    expect(
      wrapper.getComponent(SearchDateRangeSelector).props('modelValue')
    ).toEqual(emptyRange);
  });

  it('clears every filter', async () => {
    const wrapper = mountFilters({ from: 3, in: 2, dateRange: { type: 'x' } });
    await wrapper.get('.clear').trigger('click');
    const cleared = { from: null, in: null, dateRange: { ...emptyRange } };
    expect(wrapper.emitted('update:modelValue')).toEqual([[cleared]]);
    expect(wrapper.emitted('updateFilters')).toEqual([[cleared]]);
  });
});
