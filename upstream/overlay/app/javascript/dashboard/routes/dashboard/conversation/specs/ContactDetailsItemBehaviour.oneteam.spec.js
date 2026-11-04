/**
 * OneTeam behaviour spec for the conversation ContactDetailsItem.
 *
 * Covers the compact and padded layouts, hiding an empty value, the
 * default value text and a custom value slot.
 */
import { mount } from '@vue/test-utils';
import ContactDetailsItem from '../ContactDetailsItem.vue';

describe('ContactDetailsItem behaviour', () => {
  it('hides an empty value in the padded layout', () => {
    const wrapper = mount(ContactDetailsItem, { props: { title: 'Email' } });
    expect(wrapper.classes()).toContain('py-3');
    expect(wrapper.find('.break-words').exists()).toBe(false);
  });

  it('shows the value in the compact layout', () => {
    const wrapper = mount(ContactDetailsItem, {
      props: { title: 'Email', value: 'a@x.co', compact: true },
    });
    expect(wrapper.classes()).toContain('py-0');
    expect(wrapper.find('.break-words').text()).toBe('a@x.co');
  });

  it('renders a custom value and button slot', () => {
    const wrapper = mount(ContactDetailsItem, {
      props: { title: 'Phone', value: 1 },
      slots: { default: '<b>Custom</b>', button: '<button>Edit</button>' },
    });
    expect(wrapper.find('b').text()).toBe('Custom');
    expect(wrapper.find('button').text()).toBe('Edit');
  });
});
