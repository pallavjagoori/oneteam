/**
 * OneTeam behaviour spec for the dropdown search header.
 *
 * Covers typing a query, the placeholder, and the clear filter button
 * shown only for an empty query.
 */
import { mount } from '@vue/test-utils';
import DropdownSearch from '../DropdownSearch.vue';

const NextButton = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

/**
 * Mounts the search header.
 *
 * @param {object} props Search props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountSearch = props =>
  mount(DropdownSearch, {
    props: { 'onUpdate:modelValue': () => {}, ...props },
    global: { stubs: { NextButton }, mocks: { $t: key => key } },
  });

describe('DropdownSearch behaviour', () => {
  it('updates the query and clears the filter', async () => {
    const wrapper = mountSearch({
      inputPlaceholder: 'Search agents',
      showClearFilter: true,
    });
    const input = wrapper.get('input');
    expect(input.attributes('placeholder')).toBe('Search agents');
    await input.setValue('ann');
    expect(wrapper.emitted('update:modelValue')).toEqual([['ann']]);
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('remove')).toHaveLength(1);
    const space = new KeyboardEvent('keyup', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    input.element.dispatchEvent(space);
    expect(space.defaultPrevented).toBe(true);
  });

  it('hides the clear button while searching or when not allowed', () => {
    expect(
      mountSearch({ modelValue: 'ann', showClearFilter: true })
        .findComponent(NextButton)
        .exists()
    ).toBe(false);
    expect(mountSearch().findComponent(NextButton).exists()).toBe(false);
  });
});
