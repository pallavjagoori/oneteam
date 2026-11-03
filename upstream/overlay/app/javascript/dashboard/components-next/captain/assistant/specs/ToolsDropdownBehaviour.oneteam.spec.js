/**
 * OneTeam behaviour spec for the Captain tools mention dropdown.
 *
 * Covers listing tools, highlighting and scrolling to the selected one,
 * ignoring a selection with no matching item, and picking a tool.
 */
import { mount, flushPromises } from '@vue/test-utils';
import ToolsDropdown from '../ToolsDropdown.vue';

describe('ToolsDropdown behaviour', () => {
  it('highlights, scrolls to and picks tools', async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const wrapper = mount(ToolsDropdown, {
      props: {
        items: [
          { id: 'a', title: 'Search', description: 'Find docs' },
          { title: 'Handoff', description: 'To a human' },
        ],
      },
      attachTo: document.body,
    });
    await flushPromises();
    const rows = wrapper.findAll('[id^="tool-item-"]');
    expect(rows.map(r => r.attributes('id'))).toEqual([
      'tool-item-0',
      'tool-item-1',
    ]);
    expect(rows[0].classes()).toContain('bg-n-alpha-black2');
    expect(scroll).toHaveBeenCalledTimes(1);
    await wrapper.setProps({ selectedIndex: 1 });
    await flushPromises();
    expect(rows[1].classes()).toContain('bg-n-alpha-black2');
    expect(scroll).toHaveBeenCalledTimes(2);
    await wrapper.setProps({ selectedIndex: 5 });
    await flushPromises();
    expect(scroll).toHaveBeenCalledTimes(2);
    await rows[1].trigger('click');
    expect(wrapper.emitted('select')).toEqual([[1]]);
    wrapper.unmount();
    delete Element.prototype.scrollIntoView;
  });
});
