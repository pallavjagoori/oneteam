/**
 * OneTeam behaviour spec for the profile settings page wrapper.
 *
 * Covers rendering the routed page with and without keep-alive.
 */
import { markRaw } from 'vue';
import { mount } from '@vue/test-utils';
import Wrapper from '../Wrapper.vue';

const Page = markRaw({ name: 'Page', template: '<p class="page" />' });
const RouterView = {
  name: 'RouterView',
  setup: () => ({ Page }),
  template: '<div><slot :Component="Page" /></div>',
};

describe('profile Wrapper behaviour', () => {
  it.each([true, false])('renders the page (keepAlive %s)', keepAlive => {
    const wrapper = mount(Wrapper, {
      props: { keepAlive },
      global: { stubs: { RouterView } },
    });
    expect(wrapper.find('.page').exists()).toBe(true);
  });
});
