/**
 * OneTeam behaviour spec for drilldown card fallbacks.
 *
 * Covers a metric value the time formatter can't format and a record
 * without any message content.
 */
import { mount } from '@vue/test-utils';
import ReportDrilldownCard from '../ReportDrilldownCard.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: 1 } }),
}));
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key, locale: { value: 'en' } }),
}));
vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  formatTime: () => '',
}));

describe('ReportDrilldownCard fallbacks', () => {
  it('shows the raw metric and the no content text', () => {
    const wrapper = mount(ReportDrilldownCard, {
      props: {
        record: {
          record_type: 'conversation',
          conversation: { id: 1, display_id: 9 },
          metric_value: 7,
        },
      },
      global: {
        stubs: {
          Icon: true,
          TimeAgo: true,
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    });
    expect(wrapper.vm.$.setupState.metricValue).toBe('7');
    expect(wrapper.vm.$.setupState.previewText).toBe(
      'REPORT.DRILLDOWN.NO_MESSAGE_CONTENT'
    );
  });
});
