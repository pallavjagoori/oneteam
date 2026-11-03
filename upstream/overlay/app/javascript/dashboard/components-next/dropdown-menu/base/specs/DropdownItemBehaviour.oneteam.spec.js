/**
 * OneTeam behaviour spec for the base dropdown menu item.
 *
 * Covers rendering as a native link, router link, button or plain item,
 * running the click handler and closing the menu (unless asked to stay
 * open), and the icon, label and custom slot content.
 */
import { mount } from '@vue/test-utils';
import DropdownItem from '../DropdownItem.vue';

const env = vi.hoisted(() => ({ closeMenu: vi.fn() }));

vi.mock('../provider.js', () => ({
  useDropdownContext: () => ({ closeMenu: env.closeMenu }),
}));

const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a class="router"><slot /></a>',
};
const Icon = { name: 'Icon', props: ['icon'], template: '<i />' };

/**
 * Mounts the item with stubbed router link and icon.
 *
 * @param {object} props Item props.
 * @param {object} slots Slots to render.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountItem = (props = {}, slots = {}) =>
  mount(DropdownItem, {
    props,
    slots,
    global: { stubs: { RouterLink, Icon } },
  });

describe('DropdownItem behaviour', () => {
  beforeEach(() => {
    env.closeMenu = vi.fn();
  });

  it('renders a native link for string links when asked', () => {
    const link = mountItem({ link: '/x', nativeLink: true, label: 'Go' }).get(
      'li > a'
    );
    expect(link.attributes('href')).toBe('/x');
    expect(link.text()).toBe('Go');
  });

  it('renders a router link for other links', () => {
    const wrapper = mountItem({ link: { name: 'home' }, nativeLink: true });
    expect(wrapper.getComponent(RouterLink).props('to')).toEqual({
      name: 'home',
    });
    expect(mountItem({ link: '/y' }).findComponent(RouterLink).exists()).toBe(
      true
    );
  });

  it('runs the click handler and closes the menu', async () => {
    const click = vi.fn();
    const wrapper = mountItem({ click, icon: 'i-lucide-x', label: 'Do' });
    expect(wrapper.getComponent(Icon).props('icon')).toBe('i-lucide-x');
    await wrapper.get('button').trigger('click');
    expect(click).toHaveBeenCalled();
    expect(env.closeMenu).toHaveBeenCalled();
  });

  it('keeps the menu open when asked and renders plain items', async () => {
    const wrapper = mountItem(
      { preserveOpen: true },
      { default: '<span class="custom">Custom</span>' }
    );
    const item = wrapper.get('li > div');
    expect(item.classes()).not.toContain('hover:bg-n-alpha-2');
    expect(wrapper.find('.custom').exists()).toBe(true);
    await item.trigger('click');
    expect(env.closeMenu).not.toHaveBeenCalled();
    expect(wrapper.findComponent(Icon).exists()).toBe(false);
  });
});
