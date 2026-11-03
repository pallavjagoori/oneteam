/**
 * OneTeam behaviour spec for the inbox notification up/down pager.
 *
 * Covers moving to the previous or next item inside the range, ignoring
 * moves past either end, the disabled states, and the "n / total" count.
 */
import { mount } from '@vue/test-utils';
import PaginationButton from '../PaginationButton.vue';

const NextButton = {
  name: 'NextButton',
  props: { icon: String, disabled: Boolean },
  emits: ['click'],
  template: '<button :data-icon="icon" />',
};

/**
 * Mounts the pager at a position.
 *
 * @param {number} currentIndex Current item (1-based).
 * @param {number} totalLength Number of items.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountPager = (currentIndex, totalLength) =>
  mount(PaginationButton, {
    props: { currentIndex, totalLength },
    global: { stubs: { NextButton } },
  });

const buttons = wrapper => wrapper.findAllComponents(NextButton);

describe('PaginationButton behaviour', () => {
  it('moves up and down inside the range and shows the count', () => {
    const wrapper = mountPager(2, 3);
    const [up, down] = buttons(wrapper);
    expect(up.props('disabled')).toBe(false);
    expect(down.props('disabled')).toBe(false);
    up.vm.$emit('click');
    down.vm.$emit('click');
    expect(wrapper.emitted('prev')).toHaveLength(1);
    expect(wrapper.emitted('next')).toHaveLength(1);
    expect(wrapper.text().replace(/\s+/g, '')).toBe('2/3');
  });

  it('ignores moves past either end', () => {
    const first = mountPager(1, 3);
    expect(buttons(first)[0].props('disabled')).toBe(true);
    buttons(first)[0].vm.$emit('click');
    expect(first.emitted('prev')).toBeUndefined();

    const last = mountPager(3, 3);
    expect(buttons(last)[1].props('disabled')).toBe(true);
    buttons(last)[1].vm.$emit('click');
    expect(last.emitted('next')).toBeUndefined();
  });

  it('shows a single item without a total', () => {
    const wrapper = mountPager(0, 1);
    expect(buttons(wrapper)[1].props('disabled')).toBe(true);
    expect(wrapper.text().trim()).toBe('1');
  });
});
