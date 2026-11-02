/**
 * OneTeam behaviour spec for the reply editor's drag-to-resize wrapper.
 *
 * Covers the default and bounded heights, content asking the editor to
 * grow, dragging the handle with a mouse or finger, the collapse cue and
 * collapsing by dragging far enough down, ending a drag (mouse up, touch
 * end or cancel, window blur), resetting on double click and shortly
 * after a message is sent, toggling the expanded height, and cleaning
 * up when unmounted mid-drag.
 */
import { mount } from '@vue/test-utils';
import { defineComponent, h, inject } from 'vue';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import ResizableEditorWrapper from '../ResizableEditorWrapper.vue';

let requestEditorHeight;
const Child = defineComponent({
  setup() {
    requestEditorHeight = inject('requestEditorHeight');
    return () => h('textarea');
  },
});

const mountWrapper = (containerHeight = 800) =>
  mount(ResizableEditorWrapper, {
    attachTo: document.body,
    props: { containerHeight },
    slots: { default: Child },
  });

const height = wrapper =>
  wrapper.element.style.getPropertyValue('--editor-height');
const handle = wrapper => wrapper.find('.cursor-row-resize');
const fire = (target, type, clientY) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  if (clientY !== undefined) {
    Object.defineProperty(event, 'touches', { value: [{ clientY }] });
  }
  target.dispatchEvent(event);
  return event;
};
const mouse = (type, clientY) =>
  document.dispatchEvent(new MouseEvent(type, { clientY }));

describe('ResizableEditorWrapper behaviour', () => {
  let wrapper;
  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it('starts at the default height within its bounds', () => {
    wrapper = mountWrapper();
    expect(height(wrapper)).toBe('120px');
    expect(wrapper.element.style.getPropertyValue('--editor-max-allowed')).toBe(
      '600px'
    );
    wrapper.unmount();
    wrapper = mountWrapper(0);
    expect(wrapper.element.style.getPropertyValue('--editor-max-allowed')).toBe(
      '120px'
    );
  });

  it('grows when content asks and measures the panels around it', async () => {
    wrapper = mountWrapper();
    requestEditorHeight(300);
    await wrapper.vm.$nextTick();
    expect(height(wrapper)).toBe('300px');
    requestEditorHeight(50);
    await wrapper.vm.$nextTick();
    expect(height(wrapper)).toBe('120px');

    Object.defineProperty(wrapper.element, 'offsetHeight', {
      configurable: true,
      value: 420,
    });
    requestEditorHeight(900);
    await wrapper.vm.$nextTick();
    // 300px of panels leave 800 - 200 - 300 = 300px for the editor.
    expect(height(wrapper)).toBe('300px');
  });

  it('resizes by dragging with a mouse', async () => {
    wrapper = mountWrapper();
    await handle(wrapper).trigger('mousedown', { clientY: 500 });
    expect(document.body.style.cursor).toBe('row-resize');
    expect(wrapper.find('.animate-bounce').exists()).toBe(true);
    mouse('mousemove', 400);
    await wrapper.vm.$nextTick();
    expect(height(wrapper)).toBe('220px');
    mouse('mouseup');
    await wrapper.vm.$nextTick();
    expect(document.body.style.cursor).toBe('');
    mouse('mousemove', 100);
    mouse('mouseup');
    await wrapper.vm.$nextTick();
    expect(height(wrapper)).toBe('220px');

    await handle(wrapper).trigger('dblclick');
    expect(height(wrapper)).toBe('120px');
  });

  it('resizes by dragging with a finger', async () => {
    wrapper = mountWrapper();
    fire(handle(wrapper).element, 'touchstart', 500);
    const move = fire(document, 'touchmove', 450);
    await wrapper.vm.$nextTick();
    expect(move.defaultPrevented).toBe(true);
    expect(height(wrapper)).toBe('170px');
    fire(document, 'touchend');
    fire(handle(wrapper).element, 'touchstart', 500);
    fire(document, 'touchcancel');
    fire(handle(wrapper).element, 'touchstart', 500);
    window.dispatchEvent(new Event('blur'));
    await wrapper.vm.$nextTick();
    expect(document.body.style.userSelect).toBe('');
  });

  it('hints at and then collapses when dragged far enough down', async () => {
    wrapper = mountWrapper();
    await handle(wrapper).trigger('mousedown', { clientY: 500 });
    mouse('mousemove', 564);
    await wrapper.vm.$nextTick();
    expect(height(wrapper)).toBe('80px');
    expect(wrapper.find('.\\!bg-n-brand').exists()).toBe(true);
    expect(
      wrapper.element.style.getPropertyValue('--editor-collapse-progress')
    ).toBe('0.5');

    mouse('mousemove', 600);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('collapse')).toHaveLength(1);
    expect(height(wrapper)).toBe('120px');
    expect(wrapper.find('.\\!bg-n-brand').exists()).toBe(false);
  });

  it('resets shortly after a message is sent', async () => {
    vi.useFakeTimers();
    wrapper = mountWrapper();
    requestEditorHeight(300);
    emitter.emit(BUS_EVENTS.MESSAGE_SENT);
    emitter.emit(BUS_EVENTS.MESSAGE_SENT);
    vi.advanceTimersByTime(119);
    await wrapper.vm.$nextTick();
    expect(height(wrapper)).toBe('300px');
    vi.advanceTimersByTime(1);
    await wrapper.vm.$nextTick();
    expect(height(wrapper)).toBe('120px');
    vi.useRealTimers();
  });

  it('toggles between the default and expanded heights', async () => {
    wrapper = mountWrapper();
    wrapper.vm.toggleEditorExpand();
    await wrapper.vm.$nextTick();
    expect(height(wrapper)).toBe('400px');
    wrapper.vm.toggleEditorExpand();
    await wrapper.vm.$nextTick();
    expect(height(wrapper)).toBe('120px');
    wrapper.unmount();

    // In a short pane the expanded height is the maximum.
    wrapper = mountWrapper(380);
    wrapper.vm.toggleEditorExpand();
    await wrapper.vm.$nextTick();
    expect(height(wrapper)).toBe('180px');
    wrapper.vm.resetEditorHeight();
    await wrapper.vm.$nextTick();
    expect(height(wrapper)).toBe('120px');
  });

  it('cleans up when unmounted mid-drag', async () => {
    const off = vi.spyOn(emitter, 'off');
    wrapper = mountWrapper();
    await handle(wrapper).trigger('mousedown', { clientY: 500 });
    wrapper.unmount();
    wrapper = null;
    expect(document.body.style.cursor).toBe('');
    expect(off).toHaveBeenCalledWith(
      BUS_EVENTS.MESSAGE_SENT,
      expect.any(Function)
    );
    off.mockRestore();

    const idle = mountWrapper();
    idle.unmount();
    expect(document.body.style.cursor).toBe('');
    // A late request from unmounting content skips measuring.
    expect(() => requestEditorHeight(300)).not.toThrow();
  });
});
