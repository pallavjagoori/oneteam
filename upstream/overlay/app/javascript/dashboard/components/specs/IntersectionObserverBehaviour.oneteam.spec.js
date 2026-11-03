/**
 * OneTeam behaviour spec for the intersection sentinel used for
 * infinite scrolling.
 *
 * Covers observing its element with the given options and reporting
 * only when it scrolls into view.
 */
import { mount } from '@vue/test-utils';
import IntersectionObserver from '../IntersectionObserver.vue';

const env = vi.hoisted(() => ({ calls: [] }));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useIntersectionObserver: (...args) => env.calls.push(args),
}));

describe('IntersectionObserver behaviour', () => {
  it('reports when the sentinel becomes visible', () => {
    const wrapper = mount(IntersectionObserver);
    const [target, callback, options] = env.calls.at(-1);
    expect(target.value).toBe(wrapper.element);
    expect(options).toEqual({
      root: document,
      rootMargin: '100px 0 100px 0)',
    });
    callback([{ isIntersecting: false }]);
    expect(wrapper.emitted('observed')).toBeUndefined();
    callback([{ isIntersecting: true }]);
    expect(wrapper.emitted('observed')).toHaveLength(1);
  });

  it('passes custom options through', () => {
    mount(IntersectionObserver, { props: { options: { threshold: 1 } } });
    expect(env.calls.at(-1)[2]).toEqual({ threshold: 1 });
  });
});
