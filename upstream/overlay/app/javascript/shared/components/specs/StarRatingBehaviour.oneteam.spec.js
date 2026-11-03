/**
 * OneTeam behaviour spec for the CSAT star rating.
 *
 * Covers highlighting stars on hover and for the selected rating,
 * emitting the clicked rating, and ignoring hover and selection while
 * disabled.
 */
import { mount } from '@vue/test-utils';
import StarRating from '../StarRating.vue';

const filled = wrapper =>
  wrapper.findAll('span').filter(s => s.classes().includes('i-ri-star-fill'))
    .length;

describe('StarRating behaviour', () => {
  it('fills stars up to the hovered value and clears on leave', async () => {
    const wrapper = mount(StarRating);
    const stars = wrapper.findAll('button');
    expect(filled(wrapper)).toBe(0);
    await stars[2].trigger('mouseenter');
    expect(filled(wrapper)).toBe(3);
    await stars[2].trigger('mouseleave');
    expect(filled(wrapper)).toBe(0);
  });

  it('emits the clicked rating and fills the selected stars', async () => {
    const wrapper = mount(StarRating, { props: { selectedRating: 2 } });
    expect(filled(wrapper)).toBe(2);
    await wrapper.findAll('button')[4].trigger('click');
    expect(wrapper.emitted('selectRating')).toEqual([[5]]);
  });

  it('ignores hover and selection while disabled', async () => {
    const wrapper = mount(StarRating, {
      props: { selectedRating: 1, isDisabled: true },
    });
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    wrapper.vm.$.setupState.onHoverRating(4);
    wrapper.vm.$.setupState.selectRating(4);
    await wrapper.vm.$nextTick();
    expect(filled(wrapper)).toBe(1);
    expect(wrapper.emitted('selectRating')).toBeUndefined();
    expect(wrapper.get('button').classes()).toContain('cursor-not-allowed');
  });
});
