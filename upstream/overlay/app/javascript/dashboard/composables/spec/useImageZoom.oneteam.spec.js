import { ref } from 'vue';
import { useImageZoom } from '../useImageZoom';

/*
 * OneTeam coverage for the gallery image zoom guards: every handler does
 * nothing before the image element exists, hover only moves the zoom origin
 * at the minimum zoom, and leaving the image resets it to the centre.
 */
const image = () =>
  ref({
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  });

describe('useImageZoom guards (OneTeam)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ignores every action before the image loads', () => {
    const zoom = useImageZoom(ref(null));
    const event = { preventDefault: vi.fn(), clientX: 1, clientY: 1 };
    zoom.onRotate('clockwise');
    zoom.onZoom(1, 1, 1);
    zoom.onDoubleClickZoomImage(event);
    zoom.onWheelImageZoom(event);
    zoom.onMouseMove(event);
    zoom.onMouseLeave();
    zoom.resetTransformOrigin();
    vi.runAllTimers();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(zoom.getZoomOrigin(1, 1)).toEqual({ x: 50, y: 50 });
    expect(zoom.zoomScale.value).toBe(1);
    expect(zoom.activeImageRotation.value).toBe(0);
  });

  it('follows the cursor at minimum zoom and recentres on leave', () => {
    const zoom = useImageZoom(image());
    zoom.onMouseMove({ clientX: 25, clientY: 75 });
    vi.runAllTimers();
    expect(zoom.imgTransformOriginPoint.value).not.toBe('center center');
    zoom.onMouseLeave();
    vi.runAllTimers();
    expect(zoom.imgTransformOriginPoint.value).toBe('center center');
  });

  it('keeps the zoom origin while zoomed in', () => {
    const zoom = useImageZoom(image());
    zoom.onZoom(1);
    expect(zoom.imgTransformOriginPoint.value).toBe('center center');
    zoom.imgTransformOriginPoint.value = '10% 10%';
    zoom.onMouseMove({ clientX: 90, clientY: 90 });
    zoom.onMouseLeave();
    vi.runAllTimers();
    expect(zoom.imgTransformOriginPoint.value).toBe('10% 10%');
  });

  it('styles the image for zooming in or out and skips no-op zooms', () => {
    const zoom = useImageZoom(image());
    zoom.onZoom(-1);
    expect(zoom.zoomScale.value).toBe(1);
    expect(zoom.imageStyle.value.cursor).toBe('zoom-in');
    zoom.onZoom(5);
    expect(zoom.imageStyle.value.cursor).toBe('zoom-out');
    zoom.onRotate('counterclockwise');
    expect(zoom.imageWrapperStyle.value).toEqual({
      transform: 'rotate(-90deg)',
    });
  });
});
