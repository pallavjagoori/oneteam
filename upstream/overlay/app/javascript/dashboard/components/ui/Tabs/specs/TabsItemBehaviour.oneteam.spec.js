/**
 * OneTeam behaviour spec for a single tab in the woot tabs bar.
 *
 * Covers activating the tab on click, ignoring clicks while disabled,
 * the active and compact styling, and the count badge.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import TabsItem from '../TabsItem.vue';

/**
 * Mounts the tab with injected tab state.
 *
 * @param {object} props Tab props.
 * @param {number} activeIndex Index of the active tab.
 * @returns {{wrapper: object, update: Function}} Wrapper and update spy.
 */
const mountTab = (props, activeIndex = 0) => {
  const update = vi.fn();
  const wrapper = mount(TabsItem, {
    props: { name: 'Open', ...props },
    global: {
      provide: { activeIndex: ref(activeIndex), updateActiveIndex: update },
    },
  });
  return { wrapper, update };
};

describe('TabsItem behaviour', () => {
  it('activates an inactive tab and shows its count', async () => {
    const { wrapper, update } = mountTab({ index: 1, count: 4 });
    const link = wrapper.get('a');
    expect(link.classes()).toContain('text-n-slate-11');
    expect(link.classes()).toContain('py-3');
    expect(wrapper.get('a > div').classes()).toContain('bg-n-alpha-1');
    expect(wrapper.text()).toContain('4');
    await link.trigger('click');
    expect(update).toHaveBeenCalledWith(1);
  });

  it('styles the active compact tab and hides the badge', () => {
    const { wrapper } = mountTab({ isCompact: true, showBadge: false });
    expect(wrapper.get('a').classes()).toEqual(
      expect.arrayContaining(['text-n-blue-11', 'py-2.5'])
    );
    expect(wrapper.find('a > div').exists()).toBe(false);
  });

  it('marks the active badge and ignores clicks while disabled', async () => {
    const { wrapper, update } = mountTab({ disabled: true });
    expect(wrapper.get('a > div').classes()).toContain('bg-n-blue-3');
    await wrapper.get('a').trigger('click');
    expect(update).not.toHaveBeenCalled();
  });
});
