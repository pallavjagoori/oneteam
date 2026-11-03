/**
 * Covers the audit log date picker's v-model bindings, which keep the
 * picked range and range type in the filter bar.
 */
import { shallowMount } from '@vue/test-utils';
import WootDatePicker from 'dashboard/components/ui/DatePicker/DatePicker.vue';
import AuditLogFilters from '../AuditLogFilters.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

describe('AuditLogFilters picker v-model', () => {
  it('stores the date range and range type from the picker', async () => {
    const wrapper = shallowMount(AuditLogFilters, {
      props: { range: 'last30days', since: 100, until: 200 },
      global: { directives: { 'on-click-outside': {}, 'on-clickaway': {} } },
    });
    const picker = wrapper.findComponent(WootDatePicker);
    const range = [new Date(300000), new Date(400000)];
    picker.vm.$emit('update:dateRange', range);
    picker.vm.$emit('update:rangeType', 'custom');
    await wrapper.vm.$nextTick();
    const updated = wrapper.findComponent(WootDatePicker);
    expect(updated.props('dateRange')).toEqual(range);
    expect(updated.props('rangeType')).toBe('custom');
  });
});
