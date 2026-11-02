/**
 * OneTeam behaviour spec for the legacy label chip.
 *
 * Covers the classes for scheme, variant and size, the background and
 * a contrasting (or given) text colour, the colour dot for smooth and
 * dashed labels, the icon, plain text or a link, the description
 * tooltip, and the close button that removes the label.
 */
import { mount } from '@vue/test-utils';
import Label from '../Label.vue';

const mountLabel = props =>
  mount(Label, {
    props: { title: 'vip', ...props },
    global: {
      stubs: {
        FluentIcon: { props: ['icon'], template: '<i :data-icon="icon" />' },
      },
    },
  });

describe('Label behaviour', () => {
  it('shows a plain label', () => {
    const wrapper = mountLabel({ description: 'Important' });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['label', 'inline-flex'])
    );
    expect(wrapper.classes()).not.toContain('small');
    expect(wrapper.attributes('title')).toBe('Important');
    expect(wrapper.attributes('style')).toBeUndefined();
    expect(wrapper.find('span').text()).toBe('vip');
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('.label-color-dot').exists()).toBe(false);
  });

  it('colours the label and its link', () => {
    const wrapper = mountLabel({
      bgColor: '#000000',
      href: '/labels/vip',
      small: true,
      colorScheme: 'primary',
    });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['primary', 'small'])
    );
    expect(wrapper.element.style.background).toBe('rgb(0, 0, 0)');
    expect(wrapper.element.style.color).toBe('rgb(255, 255, 255)');
    const link = wrapper.find('a');
    expect(link.attributes('href')).toBe('/labels/vip');
    expect(link.element.style.color).toBe('rgb(255, 255, 255)');

    const given = mountLabel({ bgColor: '#000000', color: '#ff0000' });
    expect(given.element.style.color).toBe('rgb(255, 0, 0)');
  });

  it('uses an uncoloured link without a background', () => {
    const wrapper = mountLabel({ href: '/labels/vip' });
    expect(wrapper.find('a').attributes('style')).toBeUndefined();
  });

  it.each(['smooth', 'dashed'])('shows a colour dot for %s labels', variant => {
    const wrapper = mountLabel({ variant, color: '#ff0000', bgColor: '#000' });
    expect(wrapper.classes()).toContain(variant);
    expect(wrapper.find('.label-color-dot').element.style.background).toBe(
      'rgb(255, 0, 0)'
    );
    expect(wrapper.element.style.color).toBe('');
  });

  it('shows an icon instead of the dot', () => {
    const wrapper = mountLabel({ variant: 'smooth', icon: 'tag' });
    expect(wrapper.find('.label-color-dot').exists()).toBe(false);
    expect(wrapper.find('[data-icon="tag"]').exists()).toBe(true);
  });

  it('removes the label from the close button', async () => {
    const wrapper = mountLabel({ showClose: true, bgColor: '#ffffff' });
    const close = wrapper.find('button');
    expect(close.element.style.color).toBe('rgb(0, 0, 0)');
    await close.trigger('click');
    expect(wrapper.emitted('remove')).toEqual([['vip']]);
  });
});
