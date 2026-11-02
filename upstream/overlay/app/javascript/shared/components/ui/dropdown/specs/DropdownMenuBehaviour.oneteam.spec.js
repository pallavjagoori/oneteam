/**
 * OneTeam behaviour spec for the legacy dropdown menu list.
 *
 * Covers the placement class, moving focus down and up through the menu
 * buttons with the arrow keys (wrapping at both ends, starting from the
 * first or last button when none is focused), and doing nothing for an
 * empty menu.
 */
import { mount } from '@vue/test-utils';
import DropdownMenu from '../DropdownMenu.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => {
    env.keys = events;
  },
}));

const items = count =>
  Array.from(
    { length: count },
    (_, i) =>
      `<li class="dropdown-menu__item"><button class="button">${i}</button></li>`
  ).join('');

const mountMenu = (count, props = {}) => {
  const wrapper = mount(DropdownMenu, {
    props,
    slots: { default: items(count) },
    attachTo: document.body,
  });
  // jsdom never matches ":focus" in this selector, so answer it from
  // document.activeElement the way a browser would.
  const el = wrapper.element;
  const querySelector = el.querySelector.bind(el);
  el.querySelector = selector =>
    selector.endsWith(':focus')
      ? [...el.querySelectorAll('.button')].find(
          b => b === document.activeElement
        ) || null
      : querySelector(selector);
  return wrapper;
};

const focused = () => document.activeElement.textContent;
const press = key => env.keys[key].action();

describe('DropdownMenu behaviour', () => {
  it('sets the placement class', () => {
    const top = mountMenu(0);
    expect(top.classes()).toContain('dropdown--top');
    const none = mountMenu(0, { placement: '' });
    expect(none.classes().some(c => c.startsWith('dropdown--'))).toBe(false);
    top.unmount();
    none.unmount();
  });

  it('moves focus with the arrow keys and wraps around', () => {
    const wrapper = mountMenu(3);
    expect(env.keys.ArrowDown.allowOnFocusedInput).toBe(true);
    press('ArrowDown');
    expect(focused()).toBe('0');
    press('ArrowDown');
    press('ArrowDown');
    expect(focused()).toBe('2');
    press('ArrowDown');
    expect(focused()).toBe('0');
    press('ArrowUp');
    expect(focused()).toBe('2');
    press('ArrowUp');
    expect(focused()).toBe('1');
    wrapper.unmount();
  });

  it('starts from the last button going up and ignores an empty menu', () => {
    const wrapper = mountMenu(2);
    document.body.focus();
    press('ArrowUp');
    expect(focused()).toBe('1');
    wrapper.unmount();

    const empty = mountMenu(0);
    expect(() => press('ArrowDown')).not.toThrow();
    expect(() => press('ArrowUp')).not.toThrow();
    empty.unmount();
  });
});
