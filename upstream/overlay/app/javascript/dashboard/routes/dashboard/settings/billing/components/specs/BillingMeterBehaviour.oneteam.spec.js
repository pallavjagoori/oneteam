/**
 * Covers the billing usage meter's width and colour bands.
 */
import { mount } from '@vue/test-utils';
import BillingMeter from '../BillingMeter.vue';

const bar = consumed =>
  mount(BillingMeter, {
    props: { title: 'Agents', consumed, totalCount: 10 },
  }).find('.h-2 > .h-2');

describe('BillingMeter', () => {
  it('colours the bar by usage', () => {
    expect(bar(2).classes()).toContain('bg-n-teal-10');
    expect(bar(6).classes()).toContain('bg-n-amber-10');
    expect(bar(9).classes()).toContain('bg-n-ruby-10');
    expect(bar(6).attributes('style')).toContain('width: 60%');
  });
});
