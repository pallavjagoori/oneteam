/**
 * OneTeam behaviour spec for the conversation reports page
 * (reports/Index.vue).
 *
 * Covers applying filters (passing them to the charts, fetching the
 * summary and every metric, tracking the change), the alerts when the
 * summary throws or a metric request fails, and downloading the
 * conversation summary report.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import { REPORTS_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import { generateFileName } from 'dashboard/helper/downloadHelper';
import ConversationReports from '../Index.vue';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

const named = (name, props = [], emits = []) => ({
  name,
  props,
  emits,
  template: `<div class="${name}"><slot /></div>`,
});
const V4Button = {
  name: 'V4Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const ReportFilters = named('ReportFilters', [], ['filterChange']);
const ReportContainer = named('ReportContainer', [
  'groupBy',
  'from',
  'to',
  'businessHours',
]);

const mountPage = dispatch =>
  mount(ConversationReports, {
    global: {
      mocks: { $store: { dispatch }, $t: key => key },
      stubs: {
        ReportHeader: named('ReportHeader', ['headerTitle']),
        V4Button,
        ReportFilters,
        ReportContainer,
      },
    },
  });

const filter = {
  from: 10,
  to: 20,
  groupBy: { period: 'week' },
  businessHours: true,
};
const payload = { from: 10, to: 20, groupBy: 'week', businessHours: true };

describe('Conversation reports index behaviour', () => {
  it('starts grouped by day', () => {
    const wrapper = mountPage(vi.fn());
    expect(wrapper.findComponent(ReportContainer).props()).toMatchObject({
      from: 0,
      to: 0,
      businessHours: false,
      groupBy: expect.objectContaining({ period: 'day' }),
    });
  });

  it('fetches the summary and every metric when filters change', async () => {
    const dispatch = vi.fn().mockResolvedValue();
    const wrapper = mountPage(dispatch);
    await wrapper.findComponent(ReportFilters).vm.$emit('filterChange', filter);
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('fetchAccountSummary', payload);
    const metrics = dispatch.mock.calls
      .filter(([action]) => action === 'fetchAccountReport')
      .map(([, args]) => args.metric);
    expect(metrics).toEqual([
      'conversations_count',
      'incoming_messages_count',
      'outgoing_messages_count',
      'avg_first_response_time',
      'avg_resolution_time',
      'resolutions_count',
      'reply_time',
    ]);
    expect(dispatch).toHaveBeenCalledWith('fetchAccountReport', {
      metric: 'reply_time',
      ...payload,
    });
    expect(useTrack).toHaveBeenCalledWith(REPORTS_EVENTS.FILTER_REPORT, {
      filterValue: filter,
      reportType: 'conversations',
    });
    expect(wrapper.findComponent(ReportContainer).props()).toMatchObject({
      from: 10,
      to: 20,
      businessHours: true,
    });
    expect(useAlert).not.toHaveBeenCalled();
  });

  it('alerts when fetching fails', async () => {
    const dispatch = vi.fn(action => {
      if (action === 'fetchAccountSummary') throw new Error('down');
      return Promise.reject(new Error('down'));
    });
    const wrapper = mountPage(dispatch);
    await wrapper
      .findComponent(ReportFilters)
      .vm.$emit('filterChange', { ...filter, groupBy: undefined });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('REPORT.SUMMARY_FETCHING_FAILED');
    expect(useAlert).toHaveBeenCalledWith('REPORT.DATA_FETCHING_FAILED');
    expect(useAlert).toHaveBeenCalledTimes(8);
    expect(dispatch).toHaveBeenCalledWith(
      'fetchAccountReport',
      expect.objectContaining({ groupBy: undefined })
    );
  });

  it('downloads the conversation report', async () => {
    const dispatch = vi.fn().mockResolvedValue();
    const wrapper = mountPage(dispatch);
    await wrapper.findComponent(ReportFilters).vm.$emit('filterChange', filter);
    await wrapper.find('button').trigger('click');
    expect(dispatch).toHaveBeenLastCalledWith(
      'downloadConversationsSummaryReports',
      {
        from: 10,
        to: 20,
        businessHours: true,
        fileName: generateFileName({
          type: 'conversation',
          to: 20,
          businessHours: true,
        }),
      }
    );
  });
});
