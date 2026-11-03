/**
 * OneTeam behaviour spec for a Captain suggestion chip.
 *
 * Covers the title, the optional colour swatch, the staggered entry
 * delay, and accepting or rejecting the suggestion.
 */
import { mount } from '@vue/test-utils';
import SuggestionChip from '../SuggestionChip.vue';

/**
 * Mounts the chip.
 *
 * @param {object} props Chip props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountChip = props =>
  mount(SuggestionChip, {
    props: { title: 'billing', ...props },
    global: { stubs: { Icon: true }, mocks: { $t: key => key } },
  });

describe('SuggestionChip behaviour', () => {
  it('shows the suggestion and accepts or rejects it', async () => {
    const wrapper = mountChip({ color: '#f00', index: 1 });
    expect(wrapper.text()).toContain('billing');
    expect(wrapper.find('.rounded-sm.shadow-sm').exists()).toBe(true);
    expect(wrapper.classes()).toContain('[animation-delay:70ms]');
    const [accept, reject] = wrapper.findAll('button');
    expect(accept.attributes('title')).toBe('CONVERSATION.SUGGESTIONS.ACCEPT');
    await accept.trigger('click');
    await reject.trigger('click');
    expect(wrapper.emitted('accept')).toHaveLength(1);
    expect(wrapper.emitted('reject')).toHaveLength(1);
  });

  it('caps the delay and hides the swatch without a colour', () => {
    const wrapper = mountChip({ index: 9 });
    expect(wrapper.classes()).toContain('[animation-delay:140ms]');
    expect(wrapper.find('.rounded-sm.shadow-sm').exists()).toBe(false);
  });
});
