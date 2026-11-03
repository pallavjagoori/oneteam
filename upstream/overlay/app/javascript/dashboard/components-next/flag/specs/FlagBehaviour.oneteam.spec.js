/**
 * OneTeam behaviour spec for the country flag icon.
 *
 * Covers the lower-cased flag-icons class and the squared variant.
 */
import { mount } from '@vue/test-utils';
import Flag from '../Flag.vue';

describe('Flag behaviour', () => {
  it('renders the country flag class', () => {
    const span = mount(Flag, { props: { country: 'IN' } }).get('span');
    expect(span.classes()).toEqual(['fi', 'fi-in', 'flex-shrink-0']);
  });

  it('adds the squared class when asked', () => {
    const span = mount(Flag, { props: { country: 'us', squared: true } }).get(
      'span'
    );
    expect(span.classes()).toContain('fis');
  });
});
