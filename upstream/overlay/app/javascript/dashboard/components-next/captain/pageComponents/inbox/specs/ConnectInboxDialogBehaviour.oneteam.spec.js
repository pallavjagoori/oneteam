/**
 * OneTeam behaviour spec for the Captain connect inbox dialog.
 *
 * Covers connecting an inbox (closing the dialog on success), error
 * alerts with and without a message, cancelling from the form, and the
 * close event.
 */
import { mount } from '@vue/test-utils';
import ConnectInboxDialog from '../ConnectInboxDialog.vue';

const env = vi.hoisted(() => ({ dispatch: vi.fn(), alerts: [], closed: 0 }));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));

const Dialog = {
  name: 'Dialog',
  emits: ['close'],
  setup: () => ({
    close: () => {
      env.closed += 1;
    },
  }),
  template: '<div><slot /><slot name="footer" /></div>',
};
const Form = {
  name: 'ConnectInboxForm',
  props: ['assistantId'],
  emits: ['submit', 'cancel'],
  template: '<form />',
};

const mountDialog = () =>
  mount(ConnectInboxDialog, {
    props: { assistantId: 2 },
    global: { stubs: { Dialog, ConnectInboxForm: Form } },
  });

describe('ConnectInboxDialog behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn().mockResolvedValue();
    env.alerts = [];
    env.closed = 0;
  });

  it('connects an inbox and reports failures', async () => {
    const wrapper = mountDialog();
    const form = wrapper.findComponent(Form);
    expect(form.props('assistantId')).toBe(2);
    expect(wrapper.vm.dialogRef).toBeTruthy();
    await form.vm.$emit('submit', { inboxId: 1 });
    await Promise.resolve();
    expect(env.dispatch).toHaveBeenCalledWith('captainInboxes/create', {
      inboxId: 1,
    });
    expect(env.closed).toBe(1);

    env.dispatch.mockRejectedValueOnce(new Error('Taken'));
    await form.vm.$emit('submit', {});
    await Promise.resolve();
    env.dispatch.mockRejectedValueOnce(null);
    await form.vm.$emit('submit', {});
    await Promise.resolve();
    expect(env.alerts).toEqual([
      'CAPTAIN.INBOXES.CREATE.SUCCESS_MESSAGE',
      'Taken',
      'CAPTAIN.INBOXES.CREATE.ERROR_MESSAGE',
    ]);
  });

  it('cancels and emits close', async () => {
    const wrapper = mountDialog();
    await wrapper.findComponent(Form).vm.$emit('cancel');
    expect(env.closed).toBe(1);
    await wrapper.findComponent(Dialog).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
