/**
 * OneTeam behaviour spec for the components-next inline banner.
 *
 * Covers the colour classes, the built-in action button (emitting, and
 * showing a spinner and ignoring clicks while loading), a custom actions
 * slot, and the compact layout without actions.
 */
import { mount } from '@vue/test-utils';
import Banner from '../Banner.vue';

const Spinner = { name: 'Spinner', template: '<i class="spinner" />' };

/**
 * Mounts the banner with a stubbed spinner.
 *
 * @param {object} props Banner props.
 * @param {object} slots Slots to render.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBanner = (props = {}, slots = { default: 'Heads up' }) =>
  mount(Banner, { props, slots, global: { stubs: { Spinner } } });

describe('Banner behaviour', () => {
  it('renders a compact banner without actions', () => {
    const wrapper = mountBanner();
    expect(wrapper.text()).toBe('Heads up');
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['bg-n-slate-3', 'py-2'])
    );
    expect(wrapper.find('button').exists()).toBe(false);
    expect(Banner.props.color.validator('pink')).toBe(false);
  });

  it('emits the action from the built-in button', async () => {
    const wrapper = mountBanner({ color: 'ruby', actionLabel: 'Fix' });
    const button = wrapper.get('button');
    expect(button.classes()).toContain('bg-n-ruby-4');
    expect(button.text()).toBe('Fix');
    await button.trigger('click');
    expect(wrapper.emitted('action')).toHaveLength(1);
  });

  it('shows a spinner and ignores clicks while loading', () => {
    const wrapper = mountBanner({ actionLabel: 'Fix', isLoading: true });
    expect(wrapper.find('.spinner').exists()).toBe(true);
    wrapper.vm.$.setupState.triggerAction();
    expect(wrapper.emitted('action')).toBeUndefined();
  });

  it('renders a custom actions slot', () => {
    const wrapper = mountBanner(
      { color: 'teal' },
      { default: 'Hi', actions: '<a class="custom">Go</a>' }
    );
    expect(wrapper.find('.custom').exists()).toBe(true);
    expect(wrapper.classes()).toContain('ps-3');
  });
});
