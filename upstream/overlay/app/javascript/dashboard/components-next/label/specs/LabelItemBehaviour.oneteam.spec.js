/**
 * OneTeam behaviour spec for a removable label chip.
 *
 * Covers the colour and title, revealing the remove button on hover,
 * and removing the label.
 */
import { mount } from '@vue/test-utils';
import LabelItem from '../LabelItem.vue';

const Button = {
  name: 'Button',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

const label = { id: 5, title: 'vip', color: '#ff0000' };

/**
 * Mounts the chip.
 *
 * @param {object} props Chip props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountItem = props =>
  mount(LabelItem, {
    props: { label, ...props },
    global: { stubs: { Button } },
  });

describe('LabelItem behaviour', () => {
  it('shows the label, reports hover and removes it', async () => {
    const wrapper = mountItem();
    expect(wrapper.text()).toBe('vip');
    expect(wrapper.get('.rounded-sm').attributes('style')).toContain(
      'background-color'
    );
    expect(wrapper.find('.w-6.flex').exists()).toBe(false);
    await wrapper.trigger('mouseenter');
    expect(wrapper.emitted('hover')).toEqual([[5]]);
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('remove')).toEqual([[label]]);
  });

  it('reveals the remove button while hovered', () => {
    expect(mountItem({ isHovered: true }).find('.w-6').exists()).toBe(true);
  });
});
