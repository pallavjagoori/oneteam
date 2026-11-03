/**
 * OneTeam behaviour spec for the selectable preview card.
 *
 * Covers the heading and content, the active styles and check mark, the
 * preview image border, and the slot when there is no image.
 */
import { mount } from '@vue/test-utils';
import PreviewCard from '../PreviewCard.vue';

/**
 * Mounts the card.
 *
 * @param {object} props Card props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = props =>
  mount(PreviewCard, {
    props: { heading: 'Classic', content: 'Old layout', ...props },
    slots: { default: '<em class="slot">custom</em>' },
    global: { stubs: { FluentIcon: { template: '<i class="check" />' } } },
  });

describe('PreviewCard behaviour', () => {
  it('shows an active card with its image', () => {
    const wrapper = mountCard({ active: true, src: '/a.png' });
    expect(wrapper.text()).toContain('Classic');
    expect(wrapper.text()).toContain('Old layout');
    expect(wrapper.classes()).toContain('border-n-blue-4');
    expect(wrapper.find('.check').exists()).toBe(true);
    expect(wrapper.get('img').classes()).toContain('border-n-blue-border');
    expect(wrapper.find('.slot').exists()).toBe(false);
  });

  it('shows an inactive card with its slot or image', () => {
    const wrapper = mountCard();
    expect(wrapper.classes()).toContain('border-n-weak');
    expect(wrapper.find('.check').exists()).toBe(false);
    expect(wrapper.find('.slot').exists()).toBe(true);
    expect(mountCard({ src: '/b.png' }).get('img').classes()).toContain(
      'border-n-weak'
    );
  });
});
