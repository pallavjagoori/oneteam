/**
 * OneTeam behaviour spec for the Captain single and bulk delete dialogs.
 *
 * Covers the translation keys, deleting by entity id or explicit payload,
 * skipping a missing id, success and failure alerts, closing the dialog
 * afterwards, and the bulk delete for responses and documents.
 */
import { mount } from '@vue/test-utils';
import DeleteDialog from '../DeleteDialog.vue';
import BulkDeleteDialog from '../BulkDeleteDialog.vue';

const env = vi.hoisted(() => ({
  dispatch: vi.fn(),
  alerts: [],
  closed: 0,
}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));

const Dialog = {
  name: 'Dialog',
  props: ['title', 'confirmButtonLabel'],
  emits: ['confirm'],
  setup: () => ({
    close: () => {
      env.closed += 1;
    },
  }),
  template: '<div />',
};
const options = { global: { stubs: { Dialog } } };
const confirm = async wrapper => {
  await wrapper.findComponent(Dialog).vm.$emit('confirm');
  await new Promise(resolve => {
    setTimeout(resolve);
  });
};

describe('Captain delete dialogs behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn().mockResolvedValue();
    env.alerts = [];
    env.closed = 0;
  });

  it('deletes an entity by id or payload', async () => {
    const wrapper = mount(DeleteDialog, {
      ...options,
      props: { type: 'Assistant', translationKey: '', entity: { id: 4 } },
    });
    expect(wrapper.findComponent(Dialog).props('title')).toBe(
      'CAPTAIN.ASSISTANT.DELETE.TITLE'
    );
    expect(wrapper.vm.dialogRef).toBeTruthy();
    await confirm(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith('captainAssistant/delete', 4);
    expect(wrapper.emitted('deleteSuccess')).toHaveLength(1);
    expect(env.alerts).toEqual(['CAPTAIN.ASSISTANT.DELETE.SUCCESS_MESSAGE']);
    expect(env.closed).toBe(1);

    await wrapper.setProps({
      translationKey: 'RESPONSES',
      deletePayload: { id: 4, assistantId: 1 },
    });
    env.dispatch.mockRejectedValueOnce(new Error('no'));
    await confirm(wrapper);
    expect(env.dispatch).toHaveBeenLastCalledWith('captainAssistant/delete', {
      id: 4,
      assistantId: 1,
    });
    expect(env.alerts.at(-1)).toBe('CAPTAIN.RESPONSES.DELETE.ERROR_MESSAGE');
  });

  it('skips deleting without an id', async () => {
    const wrapper = mount(DeleteDialog, {
      ...options,
      props: { type: 'Document', translationKey: 'DOCUMENTS', entity: {} },
    });
    await confirm(wrapper);
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(env.closed).toBe(1);
  });

  it('bulk deletes responses and documents', async () => {
    const wrapper = mount(BulkDeleteDialog, {
      ...options,
      props: { type: 'AssistantResponse', bulkIds: new Set([1, 2]) },
    });
    expect(wrapper.findComponent(Dialog).props('confirmButtonLabel')).toBe(
      'CAPTAIN.RESPONSES.BULK_DELETE.CONFIRM'
    );
    expect(wrapper.vm.dialogRef).toBeTruthy();
    await confirm(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith(
      'captainBulkActions/handleBulkDelete',
      { ids: [1, 2], type: 'AssistantResponse' }
    );
    expect(wrapper.emitted('deleteSuccess')).toHaveLength(1);
    expect(env.closed).toBe(1);

    await wrapper.setProps({ type: 'AssistantDocument' });
    env.dispatch.mockRejectedValueOnce(new Error('no'));
    await confirm(wrapper);
    expect(env.alerts).toEqual([
      'CAPTAIN.RESPONSES.BULK_DELETE.SUCCESS_MESSAGE',
      'CAPTAIN.DOCUMENTS.BULK_DELETE.ERROR_MESSAGE',
    ]);
  });
});
