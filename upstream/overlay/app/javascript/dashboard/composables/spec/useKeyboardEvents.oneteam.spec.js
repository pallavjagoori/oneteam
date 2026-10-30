import { defineComponent } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useKeyboardEvents } from '../useKeyboardEvents';

/*
 * OneTeam coverage for how useKeyboardEvents treats focus: shortcuts run
 * outside text fields, Escape in a text field blurs it, and plain function
 * handlers never run while typing.
 */
vi.mock('dashboard/composables/useDetectKeyboardLayout', () => ({
  useDetectKeyboardLayout: () => Promise.resolve('QWERTY'),
}));

const mountWith = events =>
  mount(
    defineComponent({
      setup() {
        useKeyboardEvents(events);
        return () => null;
      },
    })
  );

const press = (target, key, code) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, code, bubbles: true })
  );

describe('useKeyboardEvents focus handling (OneTeam)', () => {
  it('runs function handlers outside text fields only', async () => {
    const handler = vi.fn();
    const wrapper = mountWith({ KeyA: handler });
    await flushPromises();
    press(document.body, 'a', 'KeyA');
    expect(handler).toHaveBeenCalledTimes(1);

    const input = document.createElement('input');
    document.body.appendChild(input);
    press(input, 'a', 'KeyA');
    expect(handler).toHaveBeenCalledTimes(1);
    input.remove();
    wrapper.unmount();
  });

  it('blurs a text field on Escape', async () => {
    const action = vi.fn();
    const wrapper = mountWith({ Escape: { action } });
    await flushPromises();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    press(input, 'Escape', 'Escape');
    expect(document.activeElement).not.toBe(input);
    expect(action).not.toHaveBeenCalled();
    input.remove();
    wrapper.unmount();
  });

  it('does nothing without events', async () => {
    const wrapper = mountWith(undefined);
    await flushPromises();
    wrapper.unmount();
  });
});
