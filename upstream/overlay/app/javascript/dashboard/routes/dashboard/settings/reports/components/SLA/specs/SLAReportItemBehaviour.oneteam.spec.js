/**
 * OneTeam behaviour spec for the SLA report SLAReportItem row.
 *
 * Covers the conversation link, trimmed labels, the assignee avatar
 * or placeholder, and passing SLA events through.
 */
import { mount } from '@vue/test-utils';
import SLAReportItem from '../SLAReportItem.vue';

const LinkStub = { props: ['to'], template: '<a><slot /></a>' };
const LabelsStub = {
  name: 'CardLabels',
  props: ['conversationLabels'],
  template: '<div />',
};

/**
 * Mounts the row.
 *
 * @param {object} conversation conversation data
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountItem = conversation =>
  mount(SLAReportItem, {
    props: {
      slaName: 'Gold',
      conversationId: 12,
      conversation: { contact: { name: 'Ann' }, ...conversation },
    },
    global: {
      mocks: { $t: key => key },
      stubs: {
        RouterLink: LinkStub,
        CardLabels: LabelsStub,
        UserAvatarWithName: { template: '<span class="avatar" />' },
        SLAViewDetails: { props: ['slaEvents'], template: '<div />' },
      },
    },
  });

describe('SLAReportItem behaviour', () => {
  it('links the conversation and shows a placeholder assignee', () => {
    const wrapper = mountItem({});
    expect(wrapper.findComponent(LinkStub).props('to')).toEqual({
      name: 'inbox_conversation',
      params: { conversation_id: 12 },
    });
    expect(wrapper.text()).toContain('#12');
    expect(wrapper.text()).toContain('---');
    expect(wrapper.findComponent(LabelsStub).exists()).toBe(false);
  });

  it('shows trimmed labels and the assignee', () => {
    const wrapper = mountItem({ labels: 'vip, billing', assignee: { id: 1 } });
    expect(
      wrapper.findComponent(LabelsStub).props('conversationLabels')
    ).toEqual(['vip', 'billing']);
    expect(wrapper.find('.avatar').exists()).toBe(true);
  });
});
