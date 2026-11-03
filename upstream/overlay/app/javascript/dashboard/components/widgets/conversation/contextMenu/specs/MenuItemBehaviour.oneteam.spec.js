/**
 * OneTeam behaviour spec for a conversation context menu option.
 *
 * Covers the icon, label colour pill, assigned check, and agent avatar
 * (with online status and bot badge) variants.
 */
import { mount } from '@vue/test-utils';
import MenuItem from '../menuItem.vue';

const FluentIcon = { name: 'FluentIcon', props: ['icon'], template: '<i />' };
const Icon = {
  name: 'Icon',
  props: ['icon'],
  template: '<i class="next-icon" />',
};
const Avatar = {
  name: 'Avatar',
  props: ['name', 'src', 'iconName', 'status', 'size'],
  template: '<div class="avatar"><slot name="badge" /></div>',
};

/**
 * Mounts an option.
 *
 * @param {object} props Option props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountItem = props =>
  mount(MenuItem, {
    props,
    global: { stubs: { FluentIcon, Icon, Avatar } },
  });

describe('context menu item behaviour', () => {
  it('shows a plain label by default', () => {
    const wrapper = mountItem({ option: { label: 'Open' } });
    expect(wrapper.get('.menu-label').text()).toBe('Open');
    expect(wrapper.findComponent(FluentIcon).exists()).toBe(false);
    expect(wrapper.find('.label-pill').exists()).toBe(false);
    expect(wrapper.findComponent(Avatar).exists()).toBe(false);
    expect(MenuItem.props.option.default()).toBeUndefined();
  });

  it('shows an icon only when the option has one', () => {
    expect(
      mountItem({ variant: 'icon', option: { icon: 'mail', label: 'A' } })
        .getComponent(FluentIcon)
        .props('icon')
    ).toBe('mail');
    expect(
      mountItem({ variant: 'icon', option: { label: 'A' } })
        .findComponent(FluentIcon)
        .exists()
    ).toBe(false);
  });

  it('shows label pills and the assigned check', () => {
    const label = mountItem({
      variant: 'label',
      option: { label: 'vip', color: '#f00' },
    });
    expect(label.get('.label-pill').attributes('style')).toContain(
      'background-color'
    );
    expect(label.findComponent(Icon).exists()).toBe(false);
    expect(
      mountItem({ variant: 'label', option: { label: 'x' } })
        .find('.label-pill')
        .exists()
    ).toBe(false);
    const assigned = mountItem({
      variant: 'label-assigned',
      option: { label: 'vip', color: '#f00' },
    });
    expect(assigned.find('.label-pill').exists()).toBe(true);
    expect(assigned.getComponent(Icon).props('icon')).toBe('i-lucide-check');
  });

  it('shows agents with status and a bot badge', () => {
    const online = mountItem({
      variant: 'agent',
      option: {
        label: 'Bot',
        thumbnail: 'b.png',
        iconName: 'bot',
        status: 'online',
      },
    });
    expect(online.getComponent(Avatar).props()).toMatchObject({
      name: 'Bot',
      src: 'b.png',
      iconName: 'bot',
      status: 'online',
      size: 20,
    });
    expect(online.find('.next-icon').exists()).toBe(true);
    const away = mountItem({
      variant: 'agent',
      option: { label: 'Ann', iconName: 'user', status: 'busy' },
    });
    expect(away.getComponent(Avatar).props('status')).toBeNull();
    expect(away.find('.next-icon').exists()).toBe(false);
  });
});
