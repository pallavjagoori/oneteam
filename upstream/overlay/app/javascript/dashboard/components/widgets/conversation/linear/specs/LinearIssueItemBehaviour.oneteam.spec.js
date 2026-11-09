/**
 * OneTeam behaviour spec for a linked Linear issue.
 *
 * Covers the full issue (assignee, state, priority, labels), a bare
 * issue without those details, and unlinking from the header.
 */
import { mount } from '@vue/test-utils';
import LinearIssueItem from '../LinearIssueItem.vue';

/**
 * Mounts the issue.
 *
 * @param {object} issue Linear issue
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountIssue = issue =>
  mount(LinearIssueItem, {
    props: { linkedIssue: { id: 'link-1', issue } },
    global: {
      stubs: {
        IssueHeader: {
          name: 'IssueHeader',
          emits: ['unlinkIssue'],
          template: '<div />',
        },
        Avatar: true,
        Icon: true,
        CardPriorityIcon: {
          props: ['priority'],
          template: '<i :data-p="priority" />',
        },
        WootLabel: {
          props: ['title'],
          template: '<span class="label">{{ title }}</span>',
        },
      },
    },
  });

describe('LinearIssueItem behaviour', () => {
  it('shows the full issue and unlinks it', () => {
    const wrapper = mountIssue({
      identifier: 'ENG-1',
      title: 'Broken',
      description: 'It broke',
      priority: 2,
      state: { name: 'Todo', color: '#fff' },
      assignee: { name: 'Ann', avatarUrl: 'a.png' },
      labels: { nodes: [{ id: 1, name: 'bug' }] },
    });
    expect(wrapper.text()).toContain('Ann');
    expect(wrapper.text()).toContain('High');
    expect(wrapper.find('[data-p="high"]').exists()).toBe(true);
    expect(wrapper.find('.label').text()).toBe('bug');

    wrapper.findComponent({ name: 'IssueHeader' }).vm.$emit('unlinkIssue');
    expect(wrapper.emitted('unlinkIssue')).toEqual([['link-1', 'ENG-1']]);
  });

  it('shows a bare issue without optional details', () => {
    const wrapper = mountIssue({ identifier: 'ENG-2', title: 'Bare' });
    expect(wrapper.text()).toContain('Bare');
    expect(wrapper.find('.label').exists()).toBe(false);
    expect(wrapper.find('i[data-p]').exists()).toBe(false);
  });
});
