/**
 * OneTeam behaviour spec for the Linear issues list in the conversation
 * sidebar.
 *
 * Covers loading the linked issues (spinner, list, empty state, and a
 * silent failure), reloading when the conversation changes, unlinking an
 * issue (success, a Linear error message, and the fallback message), and
 * opening and closing the create-or-link dialog (which reloads the list).
 */
import { nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import LinearAPI from 'dashboard/api/integrations/linear';
import IssuesList from '../IssuesList.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/api/integrations/linear', () => ({
  default: { getLinkedIssue: vi.fn(), unlinkIssue: vi.fn() },
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStoreGetters: () => ({
      getCurrentAccountId: computed(() => 1),
      getConversationById: computed(() => id => env.conversations[id]),
    }),
  };
});

const LinearIssueItem = {
  name: 'LinearIssueItem',
  props: ['linkedIssue'],
  emits: ['unlinkIssue'],
  template: '<div class="issue">{{ linkedIssue.issue.identifier }}</div>',
};
const CreateOrLinkIssue = {
  name: 'CreateOrLinkIssue',
  props: ['conversation', 'accountId'],
  emits: ['close'],
  template: '<div class="create" />',
};
const WootModal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  emits: ['update:show'],
  template: '<div v-if="show" class="modal"><slot /></div>',
};
const NextButton = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template:
    '<button class="add" @click="$emit(\'click\')">{{ label }}</button>',
};

const issues = [
  { id: 1, issue: { identifier: 'ENG-1' } },
  { id: 2, issue: { identifier: 'ENG-2' } },
];

const mountList = (conversationId = 5) =>
  mount(IssuesList, {
    props: { conversationId },
    global: {
      stubs: {
        LinearIssueItem,
        CreateOrLinkIssue,
        WootModal,
        NextButton,
        Button: NextButton,
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

describe('IssuesList behaviour', () => {
  beforeEach(() => {
    env.conversations = { 5: { id: 5 } };
    LinearAPI.getLinkedIssue.mockResolvedValue({ data: issues });
    LinearAPI.unlinkIssue.mockResolvedValue({});
  });

  it('loads issues and unlinks one', async () => {
    const wrapper = mountList();
    await nextTick();
    expect(wrapper.find('.spinner').exists()).toBe(true);
    await flushPromises();
    expect(LinearAPI.getLinkedIssue).toHaveBeenCalledWith(5);
    expect(wrapper.findAll('.issue').map(i => i.text())).toEqual([
      'ENG-1',
      'ENG-2',
    ]);

    await wrapper
      .findAllComponents(LinearIssueItem)[0]
      .vm.$emit('unlinkIssue', 1, 'ENG-1');
    await flushPromises();
    expect(LinearAPI.unlinkIssue).toHaveBeenCalledWith(1, 'ENG-1', 5);
    expect(useTrack).toHaveBeenCalledWith('Unlinked a linear issue');
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.LINEAR.UNLINK.SUCCESS'
    );
    expect(wrapper.findAll('.issue').map(i => i.text())).toEqual(['ENG-2']);

    LinearAPI.unlinkIssue.mockRejectedValueOnce({
      response: { data: { error: { errors: [{ message: 'Gone' }] } } },
    });
    await wrapper
      .findComponent(LinearIssueItem)
      .vm.$emit('unlinkIssue', 2, 'ENG-2');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Gone');

    LinearAPI.unlinkIssue.mockRejectedValueOnce({ response: { data: {} } });
    await wrapper
      .findComponent(LinearIssueItem)
      .vm.$emit('unlinkIssue', 2, 'ENG-2');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'INTEGRATION_SETTINGS.LINEAR.UNLINK.ERROR'
    );
  });

  it('shows the empty state and survives a failed load', async () => {
    LinearAPI.getLinkedIssue.mockResolvedValueOnce({});
    const wrapper = mountList();
    await flushPromises();
    expect(wrapper.text()).toContain(
      'INTEGRATION_SETTINGS.LINEAR.NO_LINKED_ISSUES'
    );

    LinearAPI.getLinkedIssue.mockRejectedValueOnce(new Error('down'));
    await wrapper.setProps({ conversationId: 6 });
    await flushPromises();
    expect(LinearAPI.getLinkedIssue).toHaveBeenLastCalledWith(6);
    expect(wrapper.find('.spinner').exists()).toBe(false);
    expect(wrapper.text()).toContain(
      'INTEGRATION_SETTINGS.LINEAR.NO_LINKED_ISSUES'
    );
  });

  it('opens the create dialog and reloads when it closes', async () => {
    const wrapper = mountList(7);
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
    await wrapper.find('.add').trigger('click');
    const dialog = wrapper.findComponent(CreateOrLinkIssue);
    expect(dialog.props()).toEqual({ conversation: {}, accountId: 1 });

    LinearAPI.getLinkedIssue.mockClear();
    await dialog.vm.$emit('close');
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
    expect(LinearAPI.getLinkedIssue).toHaveBeenCalledWith(7);

    await wrapper.find('.add').trigger('click');
    await wrapper.findComponent(WootModal).vm.$emit('update:show', false);
    expect(wrapper.find('.modal').exists()).toBe(false);
    await wrapper.find('.add').trigger('click');
    wrapper.findComponent(WootModal).props('onClose')();
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(false);
  });
});
