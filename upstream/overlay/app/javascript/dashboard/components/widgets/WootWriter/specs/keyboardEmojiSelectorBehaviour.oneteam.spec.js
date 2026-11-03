/**
 * OneTeam behaviour spec for the inline emoji picker.
 *
 * Covers showing nothing until there's a search, matching names and
 * shortcodes regardless of spaces or underscores (including an initial
 * search), the empty-result labels, showing each emoji, selecting one,
 * and forwarding close and remove-trigger events.
 */
import { mount } from '@vue/test-utils';
import KeyboardEmojiSelector from '../keyboardEmojiSelector.vue';

const Picker = {
  name: 'CaretAnchoredPicker',
  props: ['items', 'emptyLabel'],
  emits: ['select', 'close', 'removeTrigger', 'update:search'],
  template:
    '<ul><li v-for="item in items" :key="item.id"><slot name="leading" :item="item" /></li></ul>',
};
const mountSelector = searchKey =>
  mount(KeyboardEmojiSelector, {
    props: { searchKey },
    global: { stubs: { CaretAnchoredPicker: Picker } },
  });

describe('keyboardEmojiSelector behaviour', () => {
  it('searches emojis by name or shortcode and selects one', async () => {
    const wrapper = mountSelector();
    const picker = wrapper.findComponent(Picker);
    expect(picker.props('items')).toEqual([]);
    expect(picker.props('emptyLabel')).toBe(
      'CONVERSATION.PICKER.EMOJI.EMPTY_STATE'
    );

    await picker.vm.$emit('update:search', 'grinning face');
    const spaced = picker.props('items');
    expect(spaced[0]).toMatchObject({
      emoji: '😀',
      label: 'grinning face',
      subtitle: ':grinning_face:',
    });
    expect(wrapper.find('li').text()).toBe('😀');
    await picker.vm.$emit('update:search', 'grinning_face');
    expect(picker.props('items')[0].emoji).toBe('😀');

    await picker.vm.$emit('update:search', 'zzzz-none');
    expect(picker.props('items')).toEqual([]);
    expect(picker.props('emptyLabel')).toBe('COMBOBOX.EMPTY_SEARCH_RESULTS');

    picker.vm.$emit('select', spaced[0]);
    picker.vm.$emit('close');
    picker.vm.$emit('removeTrigger');
    expect(wrapper.emitted('selectEmoji')).toEqual([['😀']]);
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.emitted('removeTrigger')).toHaveLength(1);
  });

  it('starts from the typed search', async () => {
    const wrapper = mountSelector('grinningface');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(Picker).props('items')[0].emoji).toBe('😀');
  });
});
