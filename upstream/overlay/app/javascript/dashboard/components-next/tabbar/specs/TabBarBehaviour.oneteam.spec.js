/**
 * OneTeam behaviour spec for the segmented tab bar.
 *
 * Covers labels with icons and counts, the active tab, dividers between
 * inactive tabs, positioning the indicator under the active tab,
 * picking a tab, and the tabs validator.
 */
import { mount, flushPromises } from '@vue/test-utils';
import TabBar from '../TabBar.vue';

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useResizeObserver: () => {},
}));

const tabs = [
  { label: 'All', count: 12, icon: 'i-lucide-inbox' },
  { label: 'Mine' },
  { label: 'Open' },
  { label: 'Closed' },
];

describe('TabBar behaviour', () => {
  it('shows tabs, the active tab and the indicator, and picks a tab', async () => {
    const wrapper = mount(TabBar, {
      props: { tabs, initialActiveTab: 2 },
      attachTo: document.body,
    });
    await flushPromises();
    const buttons = wrapper.findAll('button');
    expect(buttons[0].text()).toBe('All (12)');
    expect(buttons[0].find('.i-lucide-inbox').exists()).toBe(true);
    expect(buttons[1].text()).toBe('Mine');
    expect(buttons[2].classes()).toContain('text-n-blue-11');
    expect(buttons[1].classes()).toContain('text-n-slate-10');
    const dividers = wrapper.findAll('.w-px');
    expect(dividers.map(d => d.classes('bg-n-strong'))).toEqual([
      true,
      false,
      false,
    ]);
    expect(wrapper.find('.transition-all.duration-300').exists()).toBe(true);
    expect(wrapper.get('.pointer-events-none').attributes('style')).toContain(
      'left: 0px'
    );
    await buttons[3].trigger('click');
    expect(wrapper.emitted('tabChanged')).toEqual([[tabs[3]]]);
    wrapper.unmount();
  });

  it('shows dividers after the active tab and skips a missing tab', async () => {
    const wrapper = mount(TabBar, { props: { tabs } });
    await flushPromises();
    expect(wrapper.findAll('.w-px').map(d => d.classes('bg-n-strong'))).toEqual(
      [false, true, true]
    );
    await wrapper.setProps({ initialActiveTab: 9 });
    await flushPromises();
    expect(wrapper.findAll('button.text-n-blue-11')).toHaveLength(0);
  });

  it('validates tab labels and counts', () => {
    const { validator } = TabBar.props.tabs;
    expect(validator(tabs)).toBe(true);
    expect(validator([{ label: 1 }])).toBe(false);
    expect(validator([{ label: 'A', count: '3' }])).toBe(false);
  });
});
