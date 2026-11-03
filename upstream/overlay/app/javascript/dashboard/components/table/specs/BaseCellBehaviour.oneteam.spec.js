/**
 * OneTeam behaviour spec for a table cell.
 *
 * Covers text content, slot content, the empty placeholder, and right
 * alignment for RTL accounts.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import BaseCell from '../BaseCell.vue';

const env = vi.hoisted(() => ({ rtl: false }));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => computed(() => env.rtl),
}));

describe('BaseCell behaviour', () => {
  it('shows content, a slot or a placeholder', () => {
    env.rtl = false;
    const text = mount(BaseCell, { props: { content: 'Ann' } });
    expect(text.text()).toBe('Ann');
    expect(text.classes()).not.toContain('text-right');
    expect(
      mount(BaseCell, { slots: { default: '<b>Custom</b>' } })
        .find('b')
        .text()
    ).toBe('Custom');
    expect(mount(BaseCell).get('span').text()).toBe('---');
    const empty = mount(BaseCell, { slots: { default: () => [] } });
    expect(empty.text()).toBe('');
  });

  it('aligns right for RTL accounts', () => {
    env.rtl = true;
    expect(mount(BaseCell).classes()).toContain('text-right');
  });
});
