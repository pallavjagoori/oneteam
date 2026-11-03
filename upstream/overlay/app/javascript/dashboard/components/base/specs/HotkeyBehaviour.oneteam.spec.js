/**
 * OneTeam behaviour spec for the hotkey badge.
 *
 * Covers rendering the key with a custom class.
 */
import { mount } from '@vue/test-utils';
import Hotkey from '../Hotkey.vue';

describe('Hotkey behaviour', () => {
  it('renders the key with a custom class', () => {
    const wrapper = mount(Hotkey, {
      props: { customClass: 'min-w-[60px]' },
      slots: { default: 'Esc' },
    });
    expect(wrapper.element.tagName).toBe('KBD');
    expect(wrapper.text()).toBe('Esc');
    expect(wrapper.classes()).toContain('min-w-[60px]');
  });
});
