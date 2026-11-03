/**
 * OneTeam behaviour spec for a single snackbar toast.
 *
 * Covers the message, a link action, ignoring non-link actions, and
 * the default action.
 */
import { mount } from '@vue/test-utils';
import Snackbar from '../Snackbar.vue';

const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a class="link"><slot /></a>',
};

/**
 * Mounts the toast with a stubbed router link.
 *
 * @param {object} props Toast props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountToast = props =>
  mount(Snackbar, { props, global: { stubs: { RouterLink } } });

describe('Snackbar behaviour', () => {
  it('shows the message with a link action', () => {
    const wrapper = mountToast({
      message: 'Saved',
      action: { type: 'link', to: '/inbox', message: 'View' },
    });
    expect(wrapper.text()).toContain('Saved');
    const link = wrapper.getComponent(RouterLink);
    expect(link.props('to')).toBe('/inbox');
    expect(link.text()).toBe('View');
    expect(wrapper.vm.toggleAfterTimeout).toBe(false);
  });

  it('ignores non-link actions and defaults to no action', () => {
    expect(
      mountToast({ message: 'Hi', action: { type: 'button' } })
        .findComponent(RouterLink)
        .exists()
    ).toBe(false);
    expect(
      mountToast({ message: 'Hi' }).findComponent(RouterLink).exists()
    ).toBe(false);
    expect(Snackbar.props.action.default()).toBeUndefined();
  });
});
