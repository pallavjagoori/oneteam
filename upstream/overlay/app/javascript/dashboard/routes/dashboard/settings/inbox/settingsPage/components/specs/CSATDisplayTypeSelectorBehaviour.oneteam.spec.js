/**
 * Covers the CSAT display type selector: the selected input and forwarding
 * updates from both inputs.
 */
import { mount } from '@vue/test-utils';
import CSATDisplayTypeSelector from '../CSATDisplayTypeSelector.vue';

const input = name => ({
  name,
  props: ['selected'],
  emits: ['update'],
  template: '<div />',
});
const Emoji = input('CSATEmojiInput');
const Star = input('CSATStarInput');

describe('CSATDisplayTypeSelector', () => {
  it('marks the selected type and forwards updates', () => {
    const wrapper = mount(CSATDisplayTypeSelector, {
      props: { selectedType: 'star' },
      global: { stubs: { CSATEmojiInput: Emoji, CSATStarInput: Star } },
    });
    expect(wrapper.getComponent(Emoji).props('selected')).toBe(false);
    expect(wrapper.getComponent(Star).props('selected')).toBe(true);
    wrapper.getComponent(Emoji).vm.$emit('update', 'emoji');
    wrapper.getComponent(Star).vm.$emit('update', 'star');
    expect(wrapper.emitted('update')).toEqual([['emoji'], ['star']]);
  });
});
