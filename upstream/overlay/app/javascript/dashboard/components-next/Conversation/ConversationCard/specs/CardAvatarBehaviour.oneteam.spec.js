/**
 * OneTeam behaviour spec for the conversation card avatar.
 *
 * Covers showing the selection checkbox on hover or when selected,
 * emitting selection changes, hiding the overlay when selection is
 * disabled, and hiding the thumbnail entirely.
 */
import { mount } from '@vue/test-utils';
import CardAvatar from '../CardAvatar.vue';

const Avatar = {
  name: 'Avatar',
  props: ['name', 'src', 'status'],
  template: '<div class="avatar"><slot name="overlay" /></div>',
};
const Checkbox = {
  name: 'Checkbox',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input type="checkbox" />',
};
const contact = {
  name: 'Ada',
  thumbnail: 'a.png',
  availability_status: 'online',
};

/**
 * Mounts the avatar with stubbed avatar and checkbox.
 *
 * @param {object} props Extra props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountAvatar = (props = {}) =>
  mount(CardAvatar, {
    props: { contact, ...props },
    global: { stubs: { Avatar, Checkbox } },
  });

describe('CardAvatar behaviour', () => {
  it('shows the checkbox on hover and emits selection', async () => {
    const wrapper = mountAvatar();
    expect(wrapper.getComponent(Avatar).props()).toMatchObject({
      name: 'Ada',
      src: 'a.png',
      status: 'online',
    });
    expect(wrapper.findComponent(Checkbox).exists()).toBe(false);
    await wrapper.trigger('mouseenter');
    const checkbox = wrapper.getComponent(Checkbox);
    checkbox.vm.$emit('update:modelValue', true);
    expect(wrapper.emitted('selectConversation')).toEqual([[true]]);
    await wrapper.trigger('mouseleave');
    expect(wrapper.findComponent(Checkbox).exists()).toBe(false);
  });

  it('keeps the checkbox while selected and stops overlay clicks', async () => {
    const parentClick = vi.fn();
    const wrapper = mountAvatar({ selected: true });
    wrapper.element.addEventListener('click', parentClick);
    expect(wrapper.getComponent(Checkbox).props('modelValue')).toBe(true);
    await wrapper.get('.avatar > div').trigger('click');
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('hides the overlay when selection is disabled', async () => {
    const wrapper = mountAvatar({ enableSelection: false, selected: true });
    expect(wrapper.findComponent(Checkbox).exists()).toBe(false);
  });

  it('hides the thumbnail and ignores hover', async () => {
    const wrapper = mountAvatar({ hideThumbnail: true });
    await wrapper.trigger('mouseenter');
    expect(wrapper.findComponent(Avatar).exists()).toBe(false);
    expect(wrapper.vm.$.setupState.hovered).toBe(false);
  });
});
