/**
 * OneTeam behaviour spec for the Copilot approval card (a change Copilot
 * wants to make that an agent must approve).
 *
 * Covers the summary for adding labels and for other actions, the linked
 * targets with a "more" count, the approved, expired and rejected
 * states, approving and rejecting (the saving state and storing the
 * updated card), and failures that return the saved card, an error
 * message or nothing.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import CopilotRunsAPI from 'dashboard/api/captain/copilotRuns';
import CopilotApprovalMessage from '../CopilotApprovalMessage.vue';

const env = vi.hoisted(() => ({ dispatch: null }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/api/captain/copilotRuns', () => ({
  default: { approve: vi.fn(), reject: vi.fn() },
}));

const Button = {
  name: 'Button',
  props: ['label', 'isLoading', 'disabled'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};

const message = approval => ({ run_id: 'run-1', approval });
const labelsApproval = {
  status: 'awaiting_approval',
  action: 'add_labels',
  arguments: { labels: ['vip', 'billing'] },
  count: 3,
  targets: [
    { url: '/conversations/1', label: '#1' },
    { url: '/conversations/2', label: '#2' },
  ],
};

const mountCard = approval =>
  mount(CopilotApprovalMessage, {
    props: { message: message(approval) },
    global: { stubs: { Button, RouterLink } },
  });

const PREFIX = 'CAPTAIN.COPILOT.APPROVAL';

describe('CopilotApprovalMessage behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn();
    useAlert.mockClear();
    CopilotRunsAPI.approve.mockReset();
    CopilotRunsAPI.reject.mockReset();
  });

  it('summarises a label change with its targets', () => {
    const wrapper = mountCard(labelsApproval);
    expect(wrapper.text()).toContain(`${PREFIX}.ACTIONS.ADD_LABELS`);
    expect(wrapper.findAll('a').map(a => a.attributes('href'))).toEqual([
      '/conversations/1',
      '/conversations/2',
    ]);
    expect(wrapper.text()).toContain(`${PREFIX}.MORE_TARGETS`);
    expect(wrapper.findAllComponents(Button)).toHaveLength(2);
  });

  it.each([
    ['approved', 'APPROVED'],
    ['expired', 'EXPIRED'],
    ['rejected', 'REJECTED'],
  ])('shows the %s state', (status, label) => {
    const wrapper = mountCard({
      status,
      action: 'close_conversations',
      arguments: {},
      count: 1,
      targets: [{ url: '/c/1', label: '#1' }],
    });
    expect(wrapper.text()).toContain(`${PREFIX}.ACTIONS.OTHER`);
    expect(wrapper.text()).toContain(`${PREFIX}.STATUS.${label}`);
    expect(wrapper.text()).not.toContain(`${PREFIX}.MORE_TARGETS`);
    expect(wrapper.findAllComponents(Button)).toHaveLength(0);
  });

  it('hides the target list when there are none', () => {
    const wrapper = mountCard({
      status: 'rejected',
      action: 'x',
      arguments: {},
      count: 0,
    });
    expect(wrapper.find('a').exists()).toBe(false);
  });

  it('approves and rejects the change', async () => {
    let finish;
    CopilotRunsAPI.approve.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = mountCard(labelsApproval);
    const [approve, reject] = wrapper.findAllComponents(Button);
    await approve.trigger('click');
    expect(CopilotRunsAPI.approve).toHaveBeenCalledWith('run-1');
    expect(approve.props()).toMatchObject({ isLoading: true, disabled: true });
    expect(reject.props('disabled')).toBe(true);
    finish({ data: { id: 'card', status: 'approved' } });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('copilotMessages/upsert', {
      id: 'card',
      status: 'approved',
    });
    expect(approve.props('isLoading')).toBe(false);

    CopilotRunsAPI.reject.mockResolvedValueOnce({ data: { id: 'card2' } });
    await reject.trigger('click');
    await flushPromises();
    expect(CopilotRunsAPI.reject).toHaveBeenCalledWith('run-1');
    expect(env.dispatch).toHaveBeenLastCalledWith('copilotMessages/upsert', {
      id: 'card2',
    });
  });

  it('handles failures with or without a saved card', async () => {
    const wrapper = mountCard(labelsApproval);
    const [approve] = wrapper.findAllComponents(Button);

    CopilotRunsAPI.approve.mockRejectedValueOnce({
      response: { data: { message: { id: 'saved' }, error: 'Expired' } },
    });
    await approve.trigger('click');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('copilotMessages/upsert', {
      id: 'saved',
    });
    expect(useAlert).toHaveBeenLastCalledWith('Expired');

    env.dispatch.mockClear();
    CopilotRunsAPI.approve.mockRejectedValueOnce(new Error('offline'));
    await approve.trigger('click');
    await flushPromises();
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(useAlert).toHaveBeenLastCalledWith(`${PREFIX}.ERROR`);
  });
});
