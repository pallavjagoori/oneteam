/**
 * OneTeam behaviour spec for the agent, inbox, label and team summary
 * report pages.
 *
 * Covers the download button calling downloadReports on the summary table
 * and the store keys each page passes to it.
 */
import { mount } from '@vue/test-utils';
import AgentReportsIndex from '../AgentReportsIndex.vue';
import InboxReportsIndex from '../InboxReportsIndex.vue';
import LabelReportsIndex from '../LabelReportsIndex.vue';
import TeamReportsIndex from '../TeamReportsIndex.vue';

const env = vi.hoisted(() => ({ download: vi.fn() }));

const SummaryReports = {
  name: 'SummaryReports',
  props: ['actionKey', 'type'],
  methods: { downloadReports: () => env.download() },
  template: '<div class="summary" />',
};
const ReportHeader = {
  name: 'ReportHeader',
  template: '<header><slot /></header>',
};
const V4Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

describe('Summary report pages', () => {
  it.each([
    [AgentReportsIndex, 'agent'],
    [InboxReportsIndex, 'inbox'],
    [LabelReportsIndex, 'label'],
    [TeamReportsIndex, 'team'],
  ])('downloads the %#th page reports', async (Page, type) => {
    env.download.mockClear();
    const wrapper = mount(Page, {
      global: {
        stubs: { SummaryReports, ReportHeader, V4Button, Button: V4Button },
        mocks: { $t: key => key },
      },
    });
    expect(wrapper.getComponent(SummaryReports).props('type')).toBe(type);
    await wrapper.find('button').trigger('click');
    expect(env.download).toHaveBeenCalledTimes(1);
  });
});
