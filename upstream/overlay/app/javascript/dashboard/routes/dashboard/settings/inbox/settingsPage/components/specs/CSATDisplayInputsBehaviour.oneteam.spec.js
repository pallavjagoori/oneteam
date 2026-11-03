/**
 * OneTeam behaviour spec for the CSAT display type choices.
 *
 * Covers the star and emoji previews, the selected outline, and picking
 * each display type.
 */
import { mount } from '@vue/test-utils';
import CSATStarInput from '../CSATStarInput.vue';
import CSATEmojiInput from '../CSATEmojiInput.vue';

describe('CSAT display inputs behaviour', () => {
  it('previews five stars and picks the star type', async () => {
    const wrapper = mount(CSATStarInput);
    expect(wrapper.findAll('[aria-label^="Star"]')).toHaveLength(5);
    expect(wrapper.classes()).toContain('outline-n-weak');
    await wrapper.trigger('click');
    expect(wrapper.emitted('update')).toEqual([['star']]);
    expect(
      mount(CSATStarInput, { props: { selected: true } }).classes()
    ).toContain('outline-n-brand');
  });

  it('previews emojis with the top rating highlighted and picks emoji', async () => {
    const wrapper = mount(CSATEmojiInput);
    const emojis = wrapper.findAll('span.text-2xl');
    expect(emojis).toHaveLength(5);
    expect(emojis.filter(e => e.classes('grayscale'))).toHaveLength(4);
    expect(wrapper.classes()).toContain('outline-n-weak');
    await wrapper.trigger('click');
    expect(wrapper.emitted('update')).toEqual([['emoji']]);
    expect(
      mount(CSATEmojiInput, { props: { selected: true } }).classes()
    ).toContain('outline-n-brand');
  });
});
