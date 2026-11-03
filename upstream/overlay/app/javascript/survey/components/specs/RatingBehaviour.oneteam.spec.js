/**
 * OneTeam behaviour spec for the survey emoji rating.
 *
 * Covers selecting a rating, marking the selected one, and ignoring clicks
 * when disabled.
 */
import { mount } from '@vue/test-utils';
import Rating from '../Rating.vue';

describe('Rating behaviour', () => {
  it('emits the picked rating and marks the selection', async () => {
    const wrapper = mount(Rating, { props: { selectedRating: 3 } });
    const buttons = wrapper.findAll('button');
    expect(buttons[2].classes()).toContain('selected');
    await buttons[4].trigger('click');
    expect(wrapper.emitted('selectRating')).toEqual([[5]]);
  });

  it('ignores clicks when disabled', async () => {
    const wrapper = mount(Rating, { props: { isDisabled: true } });
    expect(wrapper.find('button').classes()).toContain('disabled');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('selectRating')).toBeUndefined();
  });
});
