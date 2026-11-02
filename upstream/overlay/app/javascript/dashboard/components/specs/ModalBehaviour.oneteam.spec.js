/**
 * OneTeam behaviour spec for the legacy dashboard modal (`woot-modal`).
 *
 * Covers showing and hiding with `v-model:show`, the close button,
 * closing with Escape (only while open), closing by pressing and
 * releasing on the backdrop (not when the press starts inside the
 * dialog, and not when backdrop clicks are turned off), the deprecated
 * `onClose` prop and its warning, and the layout classes for the
 * centered, right-aligned, full-width and sized variants.
 */
import { mount } from '@vue/test-utils';
import Modal from '../Modal.vue';

const env = vi.hoisted(() => ({ listeners: {} }));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useEventListener: (target, event, handler) => {
    env.listeners[event] = handler;
  },
}));

const Button = {
  name: 'Button',
  emits: ['click'],
  template: '<button class="close" @click="$emit(\'click\')" />',
};

const mountModal = (props = {}) =>
  mount(Modal, {
    props: {
      show: true,
      'onUpdate:show': value => env.updates.push(value),
      ...props,
    },
    slots: { default: '<p class="body">Hello</p>' },
    global: { stubs: { Button, NextButton: Button } },
  });

const escape = () => {
  const event = { code: 'Escape', stopPropagation: vi.fn() };
  env.listeners.keydown(event);
  return event;
};

describe('Modal behaviour', () => {
  beforeEach(() => {
    env.listeners = {};
    env.updates = [];
  });

  it('shows the content and closes from the button', async () => {
    const wrapper = mountModal();
    expect(wrapper.find('.body').text()).toBe('Hello');
    expect(wrapper.find('.modal-mask').classes()).toContain(
      'skip-context-menu'
    );
    expect(wrapper.find('.modal-container').classes()).toContain('rounded-xl');
    await wrapper.find('.close').trigger('click');
    expect(env.updates).toEqual([false]);
    expect(wrapper.emitted('close')).toHaveLength(1);

    const hidden = mountModal({ show: false });
    expect(hidden.find('.modal-mask').exists()).toBe(false);
  });

  it('closes on Escape only while open', () => {
    const wrapper = mountModal();
    const tab = { code: 'Tab', stopPropagation: vi.fn() };
    env.listeners.keydown(tab);
    expect(tab.stopPropagation).not.toHaveBeenCalled();
    expect(escape().stopPropagation).toHaveBeenCalled();
    expect(wrapper.emitted('close')).toHaveLength(1);

    const hidden = mountModal({ show: false });
    expect(escape().stopPropagation).not.toHaveBeenCalled();
    expect(hidden.emitted('close')).toBeUndefined();
  });

  it('closes when a press on the backdrop is released', async () => {
    const wrapper = mountModal();
    env.listeners.mouseup();
    expect(wrapper.emitted('close')).toBeUndefined();

    await wrapper.find('.modal-container').trigger('mousedown');
    await wrapper.find('.modal-container').trigger('mouse');
    env.listeners.mouseup();
    expect(wrapper.emitted('close')).toBeUndefined();

    await wrapper.find('.modal-mask').trigger('mousedown');
    env.listeners.mouseup();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('ignores backdrop clicks when turned off', async () => {
    const wrapper = mountModal({
      closeOnBackdropClick: false,
      showCloseButton: false,
    });
    expect(wrapper.find('.close').exists()).toBe(false);
    await wrapper.find('.modal-mask').trigger('mousedown');
    env.listeners.mouseup();
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('still calls the deprecated onClose prop and warns about it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onClose = vi.fn();
    mountModal({ onClose });
    expect(warn).toHaveBeenCalledWith(
      "[DEPRECATED] The 'onClose' prop is deprecated. Please use the 'close' event instead."
    );
    escape();
    expect(onClose).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('applies the layout variants', () => {
    const right = mountModal({ modalType: 'right-aligned', size: 'medium' });
    expect(right.find('.modal-mask').classes()).toContain('right-aligned');
    expect(right.find('.modal-container').classes()).toContain('medium');

    const full = mountModal({ fullWidth: true, modalType: 'other' });
    expect(full.find('.modal-mask').classes()).not.toContain('right-aligned');
    const container = full.find('.modal-container').classes();
    expect(container).toContain('w-full');
    expect(container).not.toContain('rounded-xl');
  });
});
