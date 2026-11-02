/**
 * OneTeam behaviour spec for the widget's swipe wrapper (used to swipe
 * away messages and banners).
 *
 * Covers following the finger up to the 50px threshold in the allowed
 * direction, emitting `dragged` when released past the threshold (right
 * or left), snapping back on a short swipe, and ignoring touches while
 * disabled.
 */
import { mount } from '@vue/test-utils';
import DragWrapper from '../DragWrapper.vue';

const touch = clientX => ({ touches: [{ clientX }] });

const mountWrapper = props =>
  mount(DragWrapper, { props, slots: { default: '<p>Hi</p>' } });

const swipe = async (wrapper, from, to) => {
  await wrapper.trigger('touchstart', touch(from));
  await wrapper.trigger('touchmove', touch(to));
};

describe('DragWrapper behaviour', () => {
  it('emits a right swipe past the threshold', async () => {
    const wrapper = mountWrapper({ direction: 'right' });
    expect(wrapper.text()).toBe('Hi');
    await swipe(wrapper, 100, 200);
    expect(wrapper.attributes('style')).toContain('translateX(50px)');
    await wrapper.trigger('touchend');
    expect(wrapper.emitted('dragged')).toEqual([['right']]);
    expect(wrapper.attributes('style')).toContain('translateX(0px)');

    await swipe(wrapper, 100, 120);
    expect(wrapper.attributes('style')).toContain('translateX(20px)');
    await wrapper.trigger('touchend');
    expect(wrapper.emitted('dragged')).toHaveLength(1);
  });

  it('emits a left swipe past the threshold', async () => {
    const wrapper = mountWrapper({ direction: 'left' });
    await swipe(wrapper, 200, 100);
    expect(wrapper.attributes('style')).toContain('translateX(-50px)');
    await wrapper.trigger('touchend');
    expect(wrapper.emitted('dragged')).toEqual([['left']]);

    await swipe(wrapper, 200, 190);
    await wrapper.trigger('touchend');
    expect(wrapper.emitted('dragged')).toHaveLength(1);
  });

  it('ignores touches while disabled', async () => {
    const wrapper = mountWrapper({ direction: 'right', disabled: true });
    await swipe(wrapper, 100, 200);
    await wrapper.trigger('touchend');
    expect(wrapper.attributes('style')).toContain('translateX(0px)');
    expect(wrapper.emitted('dragged')).toBeUndefined();
  });

  it('does not move for an unknown direction', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = mountWrapper({ direction: 'up' });
    await swipe(wrapper, 100, 200);
    expect(wrapper.attributes('style')).toContain('translateX(0px)');
    warn.mockRestore();
  });
});
