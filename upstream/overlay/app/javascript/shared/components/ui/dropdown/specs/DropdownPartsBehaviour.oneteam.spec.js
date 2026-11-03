/**
 * Behaviour specs for the small dropdown parts: divider, header and the
 * add-label button.
 */
import { mount } from '@vue/test-utils';
import DropdownDivider from '../DropdownDivider.vue';
import DropdownHeader from '../DropdownHeader.vue';
import AddLabel from '../AddLabel.vue';

describe('Dropdown parts', () => {
  it('renders a non-focusable divider', () => {
    const wrapper = mount(DropdownDivider);
    expect(wrapper.find('li').attributes('aria-disabled')).toBe('true');
  });

  it('renders the header title and slot', () => {
    const wrapper = mount(DropdownHeader, {
      props: { title: 'Agents' },
      slots: { default: '<b>extra</b>' },
    });
    expect(wrapper.text()).toContain('Agents');
    expect(wrapper.find('b').exists()).toBe(true);
  });

  it('emits add when the add-label button is clicked', async () => {
    const wrapper = mount(AddLabel, {
      global: {
        mocks: { $t: key => key },
        stubs: { Button: { template: '<button />' } },
      },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('add')).toHaveLength(1);
  });
});
