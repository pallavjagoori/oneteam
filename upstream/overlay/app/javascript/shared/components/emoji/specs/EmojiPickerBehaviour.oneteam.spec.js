/**
 * OneTeam behaviour spec for the shared emoji picker.
 *
 * Covers rendering sections, tinting on hover, selecting an emoji and
 * recording it as recent, and the no results state.
 */
import { mount } from '@vue/test-utils';
import EmojiPicker from '../EmojiPicker.vue';
import { addRecentEmoji } from 'shared/components/emoji/pickerHelper';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('virtua/vue', () => ({
  Virtualizer: {
    props: ['data'],
    template:
      '<div><template v-for="item in data" :key="item.name"><slot :item="item" /></template></div>',
  },
}));
vi.mock('shared/components/emoji/pickerHelper', () => ({
  getRecentEmojis: () => [],
  getEmojiTint: () => 'rgb(1, 2, 3)',
  addRecentEmoji: vi.fn(() => ['😀']),
  buildEmojiSections: search =>
    search === 'none'
      ? []
      : [
          {
            name: 'Smileys',
            emojis: [{ slug: 'grin', name: 'grin', emoji: '😀' }],
          },
        ],
}));

describe('EmojiPicker behaviour', () => {
  it('tints, selects and records emoji', async () => {
    const wrapper = mount(EmojiPicker, { attachTo: document.body });
    expect(document.activeElement).toBe(wrapper.find('input').element);
    expect(wrapper.find('h5').text()).toBe('Smileys');
    const button = wrapper.find('button');
    await button.trigger('mouseenter');
    expect(button.element.style.getPropertyValue('--ep-tint')).toBe(
      'rgb(1, 2, 3)'
    );
    await button.trigger('click');
    expect(addRecentEmoji).toHaveBeenCalledWith({
      slug: 'grin',
      name: 'grin',
      emoji: '😀',
    });
    expect(wrapper.emitted('select')).toEqual([
      [{ type: 'emoji', value: '😀', emoji: '😀' }],
    ]);
    wrapper.unmount();
  });

  it('shows the empty state when nothing matches', async () => {
    const wrapper = mount(EmojiPicker);
    await wrapper.find('input').setValue('none');
    expect(wrapper.text()).toContain('EMOJI_ICON_PICKER.NO_EMOJI');
    expect(wrapper.find('button').exists()).toBe(false);
  });
});
