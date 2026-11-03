/**
 * OneTeam behaviour spec for the next-gen icon.
 *
 * Covers class-name icons, passing vnode and function icons through
 * unwrapped, and rendering nothing without an icon.
 */
import { h } from 'vue';
import { mount } from '@vue/test-utils';
import Icon from '../Icon.vue';

describe('Icon behaviour', () => {
  it('renders a class-name icon', () => {
    expect(mount(Icon, { props: { icon: 'i-lucide-x' } }).html()).toContain(
      'class="i-lucide-x"'
    );
  });

  it('passes vnode icons through and never wraps function icons', () => {
    const vnode = h('b', { class: 'vn' });
    expect(
      mount(Icon, { props: { icon: vnode } })
        .find('b.vn')
        .exists()
    ).toBe(true);
    const fn = () => h('svg', { class: 'fn' });
    expect(
      mount(Icon, { props: { icon: fn } })
        .find('span')
        .exists()
    ).toBe(false);
  });

  it('renders nothing without an icon', () => {
    expect(
      mount(Icon, { props: { icon: '' } })
        .find('span')
        .exists()
    ).toBe(false);
  });
});
