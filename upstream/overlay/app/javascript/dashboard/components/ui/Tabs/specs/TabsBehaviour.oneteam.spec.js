/**
 * OneTeam behaviour spec for the scrollable tabs container.
 *
 * Covers the border option, providing the active index to tab items and
 * emitting changes, showing scroll buttons only when the list overflows,
 * and scrolling left and right (ignored once the elements are gone).
 */
import { defineComponent, inject, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import Tabs from '../Tabs.vue';

const env = vi.hoisted(() => ({ width: null }));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useElementSize: () => ({ width: env.width }),
}));

const Probe = defineComponent({
  setup() {
    const activeIndex = inject('activeIndex');
    const update = inject('updateActiveIndex');
    return { activeIndex, update };
  },
  template: '<li @click="update(2)">{{ activeIndex }}</li>',
});

const mountTabs = props =>
  mount(Tabs, {
    props,
    slots: { default: Probe },
    global: { stubs: { 'fluent-icon': true } },
  });

describe('Tabs behaviour', () => {
  let scrollWidth;
  beforeEach(() => {
    env.width = ref(0);
    scrollWidth = 100;
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(
      () => scrollWidth
    );
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(200);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provides the active index and emits changes', async () => {
    const wrapper = mountTabs({ index: 1 });
    expect(wrapper.classes()).toContain('border-b');
    expect(wrapper.find('li').text()).toBe('1');
    await wrapper.find('li').trigger('click');
    expect(wrapper.emitted('change')).toEqual([[2]]);
    expect(wrapper.findAll('button')).toHaveLength(0);
    expect(mountTabs({ border: false }).classes()).not.toContain('border-b');
  });

  it('scrolls an overflowing list', async () => {
    const wrapper = mountTabs();
    scrollWidth = 300;
    env.width.value = 50;
    await nextTick();
    await nextTick();
    const list = wrapper.find('ul').element;
    list.scrollTo = vi.fn();
    list.scrollLeft = 150;
    const [left, right] = wrapper.findAll('button');
    await left.trigger('click');
    await right.trigger('click');
    expect(list.scrollTo.mock.calls.map(([arg]) => arg.left)).toEqual([
      50, 250,
    ]);
    expect(wrapper.find('ul').classes()).toContain('overflow-hidden');

    const vnodeKey = '__vnode';
    const scrollLeft = left.element[vnodeKey].props.onClick;
    wrapper.unmount();
    scrollLeft();
    expect(list.scrollTo).toHaveBeenCalledTimes(2);
  });
});
