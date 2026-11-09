/**
 * OneTeam behaviour spec for the Linear create or link issue modal.
 *
 * Covers the default title without a sender, switching between the
 * create and link tabs, and closing from either form.
 */
import { mount } from '@vue/test-utils';
import CreateOrLinkIssue from '../CreateOrLinkIssue.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) =>
      params ? `${key}:${params.conversationId}:${params.name}` : key,
  }),
}));

/**
 * Builds a form stub that can close the modal.
 *
 * @param {string} name stub name
 * @returns {object}
 */
const form = name => ({
  name,
  props: ['title'],
  emits: ['close'],
  template: '<div />',
});

describe('CreateOrLinkIssue behaviour', () => {
  it('switches tabs and closes from either form', async () => {
    const wrapper = mount(CreateOrLinkIssue, {
      props: { accountId: 1, conversation: { id: 7 } },
      global: {
        mocks: { $t: key => key },
        stubs: {
          WootModalHeader: true,
          WootTabs: {
            name: 'WootTabs',
            emits: ['change'],
            template: '<div><slot /></div>',
          },
          WootTabsItem: true,
          CreateIssue: form('CreateIssue'),
          LinkIssue: form('LinkIssue'),
        },
      },
    });
    const create = wrapper.findComponent({ name: 'CreateIssue' });
    expect(create.props('title')).toBe(
      'INTEGRATION_SETTINGS.LINEAR.LINK.LINK_TITLE:7:null'
    );
    create.vm.$emit('close');

    wrapper.findComponent({ name: 'WootTabs' }).vm.$emit('change', 1);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'CreateIssue' }).exists()).toBe(false);
    wrapper.findComponent({ name: 'LinkIssue' }).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(2);
  });
});
