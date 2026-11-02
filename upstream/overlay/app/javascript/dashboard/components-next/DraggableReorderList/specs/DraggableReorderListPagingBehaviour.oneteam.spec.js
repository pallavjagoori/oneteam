/**
 * OneTeam behaviour spec for the drag list's scrolling and cross-page moves.
 *
 * Complements the upstream spec with: autoscrolling a scrollable parent
 * while the cursor is parked near its top or bottom (and stopping in the
 * middle or at the ends), flipping to the previous or next page by
 * hovering an edge, re-aiming once the new page loads, the positions
 * saved when a row lands at the end or top of the new page, and
 * cancelling a drag with Escape.
 */
import { h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import DraggableReorderList from '../DraggableReorderList.vue';

const env = vi.hoisted(() => ({}));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useRafFn: fn => {
    env.frame = fn;
    return { pause: () => env.raf.push('pause'), resume: () => env.raf.push('resume') };
  },
}));

const move = (clientX, clientY) =>
  window.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY }));
const release = () => window.dispatchEvent(new MouseEvent('pointerup'));

const page = (from, n = 3) =>
  Array.from({ length: n }, (_, i) => ({ id: from + i, title: `Row ${from + i}`, position: (from + i) * 10 }));

const stubGeometry = wrapper => {
  wrapper.element.getBoundingClientRect = () => ({ left: 0, right: 500, top: 0, bottom: 600 });
  wrapper.findAll('[data-drag-id]').forEach((li, index) => {
    li.element.getBoundingClientRect = () => ({ top: index * 50, height: 40, bottom: index * 50 + 40 });
  });
};

const mountList = (props, parent) =>
  mount(DraggableReorderList, {
    props,
    attachTo: parent,
    slots: {
      item: scope => h('div', { class: 'card' }, scope.item.title),
      ghost: scope => h('div', { class: 'ghost' }, scope.item.title),
    },
    global: { stubs: { Icon: true, teleport: true } },
  });

const press = (wrapper, id) => {
  stubGeometry(wrapper);
  wrapper.find(`[data-drag-id="${id}"]`).element.dispatchEvent(
    new MouseEvent('pointerdown', { button: 0, clientX: 250, clientY: 20, bubbles: true })
  );
};

describe('Draggable reorder list paging behaviour', () => {
  let wrapper;
  let parent;

  beforeEach(() => {
    env.raf = [];
    env.target = null;
    document.elementFromPoint = vi.fn(() => env.target);
    parent = document.createElement('div');
    parent.style.overflowY = 'auto';
    document.body.appendChild(parent);
  });

  afterEach(() => {
    wrapper?.unmount();
    parent.remove();
    vi.useRealTimers();
  });

  it('autoscrolls the scrollable parent near its edges', async () => {
    Object.defineProperties(parent, {
      scrollHeight: { value: 2000, configurable: true },
      clientHeight: { value: 600, configurable: true },
    });
    parent.scrollTop = 100;
    parent.getBoundingClientRect = () => ({ top: 0, bottom: 600 });
    wrapper = mountList({ items: page(1) }, parent);
    env.frame();
    press(wrapper, 1);
    move(250, 10);
    await nextTick();
    expect(env.raf).toContain('resume');
    env.frame();
    expect(parent.scrollTop).toBe(90);
    move(250, 590);
    move(250, 300);
    expect(env.raf.at(-1)).toBe('pause');
    env.frame();
    expect(parent.scrollTop).toBe(90);
    parent.scrollTop = 0;
    move(250, 10);
    expect(env.raf.at(-1)).toBe('pause');
    parent.scrollTop = 1400;
    move(250, 590);
    expect(env.raf.at(-1)).toBe('pause');
    release();
  });

  it('flips to the previous page and saves at the end of it', async () => {
    vi.useFakeTimers();
    wrapper = mountList({ items: page(11), currentPage: 2, totalPages: 3 });
    press(wrapper, 12);
    move(30, 30);
    await nextTick();
    vi.advanceTimersByTime(600);
    expect(wrapper.emitted('navigatePage')).toEqual([[1]]);
    await wrapper.setProps({ items: page(1), currentPage: 1 });
    await nextTick();
    stubGeometry(wrapper);
    move(250, 300);
    release();
    expect(wrapper.emitted('reorder').at(-1)[0]).toEqual({ 12: 25 });
  });

  it('flips to the next page and lands at its top', async () => {
    vi.useFakeTimers();
    wrapper = mountList({ items: page(11), currentPage: 2, totalPages: 3 });
    press(wrapper, 12);
    move(480, 30);
    await nextTick();
    vi.advanceTimersByTime(600);
    expect(wrapper.emitted('navigatePage')).toEqual([[3]]);
    await wrapper.setProps({ items: page(21), currentPage: 3 });
    await nextTick();
    stubGeometry(wrapper);
    env.target = wrapper.find('[data-drag-id="21"]').element;
    move(250, 5);
    release();
    expect(wrapper.emitted('reorder').at(-1)[0]).toEqual({ 12: 215 });
  });

  it('ignores page loads after the drag ends and cancels on Escape', async () => {
    wrapper = mountList({ items: page(1) });
    await wrapper.setProps({ items: page(4) });
    press(wrapper, 4);
    move(250, 120);
    await nextTick();
    expect(wrapper.emitted('dragging')).toEqual([[true]]);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('dragging')).toEqual([[true], [false]]);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    release();
    expect(wrapper.emitted('reorder')).toBeUndefined();
  });
});
