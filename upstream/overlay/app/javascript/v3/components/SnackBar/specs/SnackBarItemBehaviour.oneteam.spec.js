/**
 * OneTeam behaviour spec for the v3 snackbar item, with and without a link
 * action.
 */
import { mount } from '@vue/test-utils';
import Item from '../Item.vue';

const RouterLink = { props: ['to'], template: '<a :href="to"><slot /></a>' };

describe('SnackBar Item', () => {
  it('shows a link action', () => {
    const wrapper = mount(Item, {
      props: {
        message: 'Saved',
        action: { type: 'link', to: '/app/settings', message: 'View' },
      },
      global: { stubs: { RouterLink } },
    });
    expect(wrapper.classes()).toContain('justify-between');
    expect(wrapper.find('a').attributes('href')).toBe('/app/settings');
    expect(wrapper.find('a').text()).toBe('View');
  });

  it('centres a plain message', () => {
    const wrapper = mount(Item, {
      props: { message: 'Saved', action: null },
      global: { stubs: { RouterLink } },
    });
    expect(wrapper.classes()).toContain('justify-center');
    expect(wrapper.find('a').exists()).toBe(false);
    const other = mount(Item, {
      props: { action: { type: 'button', message: 'Undo' } },
      global: { stubs: { RouterLink } },
    });
    expect(other.find('.ml-4').exists()).toBe(true);
    expect(other.find('a').exists()).toBe(false);
  });
});
