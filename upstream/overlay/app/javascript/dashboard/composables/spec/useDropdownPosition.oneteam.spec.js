import { ref, nextTick } from 'vue';
import { useDropdownPosition } from '../useDropdownPosition';

/*
 * OneTeam coverage for dropdown placement. Element and window sizes come
 * from @vueuse/core, which is replaced by plain refs so each test can set
 * where the trigger sits and how big the dropdown is.
 */
const boxes = vi.hoisted(() => new Map());
const win = vi.hoisted(() => ({}));

vi.mock('@vueuse/core', async () => {
  const { ref: vueRef } = await import('vue');
  const box = () => ({
    top: vueRef(0),
    bottom: vueRef(0),
    left: vueRef(0),
    right: vueRef(0),
    width: vueRef(0),
    height: vueRef(0),
    update: vi.fn(),
  });
  win.width = vueRef(1000);
  win.height = vueRef(800);
  return {
    useElementBounding: target => {
      const b = box();
      boxes.set(target, b);
      return b;
    },
    useWindowSize: () => win,
  };
});

const setBox = (target, values) =>
  Object.entries(values).forEach(([key, value]) => {
    boxes.get(target)[key].value = value;
  });

describe('useDropdownPosition (OneTeam)', () => {
  let trigger;
  let dropdown;
  let container;

  beforeEach(() => {
    trigger = ref(null);
    dropdown = ref(null);
    container = ref(null);
    win.width.value = 1000;
    win.height.value = 800;
    document.body.innerHTML = '';
  });

  it('pushes a start-aligned dropdown left when it overflows its container', () => {
    const { position } = useDropdownPosition(trigger, dropdown, true, {
      container,
      align: 'start',
    });
    setBox(container, { left: 0, right: 300 });
    setBox(trigger, { left: 250, top: 10, bottom: 30 });
    setBox(dropdown, { width: 100, height: 50 });
    expect(position.value.style).toEqual({ left: '-50px' });
    setBox(trigger, { left: 100 });
    expect(position.value.style).toEqual({ left: '0px' });
  });

  it('flips the anchor for right-to-left layouts', () => {
    document.body.innerHTML = '<div id="app" dir="rtl"></div>';
    const { position } = useDropdownPosition(trigger, dropdown, true, {
      align: 'start',
    });
    setBox(trigger, { right: 50, bottom: 30 });
    expect(position.value.style).toEqual({ right: '-150px' });
  });

  it('places a fixed popover above when only that side fits', () => {
    const { fixedPosition } = useDropdownPosition(trigger, dropdown, true);
    setBox(dropdown, { width: 100, height: 300 });
    setBox(trigger, { top: 700, bottom: 720, left: 500, right: 600 });
    expect(fixedPosition.value.style).toMatchObject({
      bottom: '108px',
      maxHeight: '676px',
      right: '400px',
    });
  });

  it('keeps a fixed popover inside the window edges', () => {
    const start = useDropdownPosition(trigger, dropdown, true, {
      align: 'start',
    }).fixedPosition;
    setBox(trigger, { left: 950, right: 990, top: 10, bottom: 30 });
    expect(start.value.style.right).toBe('16px');
    setBox(trigger, { left: 2 });
    expect(start.value.style.left).toBe('16px');

    const end = useDropdownPosition(trigger, dropdown, true).fixedPosition;
    setBox(trigger, { right: 100 });
    expect(end.value.style.left).toBe('16px');
  });

  it('updates the container bounds when it opens', async () => {
    const enabled = ref(false);
    useDropdownPosition(trigger, dropdown, enabled, { container });
    enabled.value = true;
    await nextTick();
    expect(boxes.get(container).update).toHaveBeenCalled();
    enabled.value = false;
    await nextTick();
    expect(boxes.get(container).update).toHaveBeenCalledTimes(1);
  });

  it('updates only the trigger and dropdown without a container', () => {
    const { updatePosition } = useDropdownPosition(trigger, dropdown, true);
    updatePosition();
    expect(boxes.get(trigger).update).toHaveBeenCalled();
    expect(boxes.get(null).update).not.toHaveBeenCalled();
  });
});
