/**
 * OneTeam behaviour spec for the base SVG icon.
 *
 * Covers fluent icons with one or several paths and the stroked
 * (non-fluent) icon library layout.
 */
import { mount } from '@vue/test-utils';
import Icon from '../Icon.vue';

const icons = {
  'one-outline': 'M1',
  'many-filled': ['M2', 'M3'],
};

describe('Icon behaviour', () => {
  it('renders a single fluent path with the default size', () => {
    const wrapper = mount(Icon, { props: { icon: 'one', icons } });
    const svg = wrapper.get('svg');
    expect(svg.attributes('width')).toBe('20');
    expect(svg.attributes('viewBox')).toBe('0 0 24 24');
    expect(wrapper.findAll('path').map(p => p.attributes('d'))).toEqual(['M1']);
  });

  it('renders every path of a multi-path icon', () => {
    const wrapper = mount(Icon, {
      props: { icon: 'many', icons, type: 'filled', size: 16 },
    });
    expect(wrapper.findAll('path').map(p => p.attributes('d'))).toEqual([
      'M2',
      'M3',
    ]);
    expect(wrapper.get('path').attributes('fill')).toBe('currentColor');
  });

  it('renders stroked groups for other icon libraries', () => {
    const wrapper = mount(Icon, {
      props: { icon: 'many', icons, type: 'filled', iconLib: 'lucide' },
    });
    expect(wrapper.findAll('g')).toHaveLength(2);
    expect(wrapper.get('path').attributes('stroke')).toBe('currentColor');
  });
});
