/**
 * Covers the SLA event row: its label, formatted event times and the
 * show-more slot.
 */
import { mount } from '@vue/test-utils';
import SLAEventItem from '../SLAEventItem.vue';

describe('SLAEventItem', () => {
  it('formats each event time', () => {
    const wrapper = mount(SLAEventItem, {
      props: { label: 'FRT', items: [{ id: 1, created_at: 0 }] },
      slots: { showMore: '<button>More</button>' },
    });
    expect(wrapper.text()).toContain('FRT');
    expect(wrapper.findAll('span.tabular-nums')).toHaveLength(1);
    expect(wrapper.find('span.tabular-nums').text()).toMatch(
      /\d{4}, \d{2}:\d{2} [AP]M/
    );
    expect(wrapper.find('button').text()).toBe('More');
  });
});
